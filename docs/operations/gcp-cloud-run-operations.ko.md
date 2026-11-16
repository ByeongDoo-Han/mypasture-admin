# 관리자 Cloud Run 운영 가이드

## 배포 구조

관리자 앱은 Spring API와 분리된 Next.js Cloud Run 서비스입니다. 브라우저 요청은 Cloud Run direct IAP를 먼저 통과하고, 애플리케이션은 다시 백엔드의 `ADMIN` 역할을 확인합니다.

```text
운영자 브라우저 -> Google IAP -> Admin Cloud Run -> HTTPS Spring API
```

Admin Cloud Run은 Cloud SQL과 Redis 권한을 갖지 않습니다. JWT는 브라우저 JavaScript가 읽을 수 없는 HttpOnly cookie에만 저장하고, Next.js BFF가 백엔드 API를 호출합니다.

## GitHub Environment 변수

`staging`, `prod` Environment에 다음 값을 등록합니다. 비밀번호나 JSON key가 아니라 Terraform output으로 얻는 공개 인프라 식별자입니다.

| 이름 | 값 |
|---|---|
| `GCP_PROJECT_ID` | 환경별 GCP project ID |
| `GCP_REGION` | 기본값 `asia-northeast3` |
| `GCP_ARTIFACT_REPOSITORY` | `mypasture-<environment>-admin` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Admin 저장소 전용 WIF provider 전체 이름 |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | Admin 저장소 전용 배포 service account email |
| `GCP_DEPLOY_ENABLED` | 기반 준비 후 staging 자동 배포를 켤 때 `true` |

`prod` Environment에는 required reviewer를 설정합니다. Service account key와 `API_BASE_URL`은 GitHub secret으로 복제하지 않습니다. `API_BASE_URL`은 Terraform이 Cloud Run 런타임 환경 변수로 관리합니다.

## 최초 구축 순서

1. 백엔드 인프라 Terraform을 `admin_enabled = false`로 적용해 Admin Artifact Registry와 runtime service account를 만듭니다.
2. 백엔드 `bootstrap/github-actions`에 Admin repository ID와 `admin_deployments`를 설정해 WIF를 적용합니다.
3. Terraform output의 값을 이 저장소의 `staging`, `prod` GitHub Environment에 등록합니다.
4. `Deploy Admin to GCP`을 staging, `image-only` 모드로 실행해 초기 이미지를 Artifact Registry에 올리고 summary의 digest URI를 확인합니다.
5. 해당 digest를 `admin_container_image`로 지정하고 `admin_enabled = true`, `admin_api_base_url`, `admin_iap_members`를 설정해 플랫폼 Terraform을 적용합니다.
6. 배포 workflow를 `deploy` 모드로 다시 실행하고 ready revision과 `Iap Enabled: true`를 확인합니다.
7. 검증이 끝나면 staging GitHub Environment의 `GCP_DEPLOY_ENABLED`를 `true`로 설정합니다.

IAP를 프로젝트에서 처음 사용하는 경우, 특히 Google Cloud Organization이 없는 프로젝트는 OAuth 초기 설정을 콘솔에서 한 번 완료해야 할 수 있습니다. 이후 운영자 권한은 Terraform의 `admin_iap_members`로 관리합니다.

## 자동 배포 정책

- `GCP_DEPLOY_ENABLED=true`인 경우에만 `main`의 Admin CI 성공이 staging 배포를 시작합니다.
- production은 `main`에서 workflow를 수동 실행하고 Environment 승인을 거칩니다.
- 이미지는 commit SHA tag로 push한 뒤 digest로 Cloud Run에 반영합니다.
- Terraform은 CPU, memory, scaling, IAP, runtime 환경 변수를 관리하고 workflow는 image만 변경합니다.
- 새 revision이 준비되지 않으면 이전 revision이 계속 요청을 처리합니다. 배포 후 검증 실패 시 workflow가 이전 image로 복구합니다.

## 운영 확인

```bash
gcloud run services describe mypasture-staging-admin \
  --project=YOUR_STAGING_PROJECT \
  --region=asia-northeast3
```

확인 항목은 다음과 같습니다.

- `Iap Enabled: true`
- latest created revision과 latest ready revision 일치
- 최소 인스턴스 0, 최대 인스턴스 1 또는 2
- runtime service account가 `mypasture-<environment>-admin`인지 확인
- 외부 사용자가 IAP 로그인 없이 관리자 화면에 접근할 수 없는지 확인
- IAP를 통과해도 백엔드 `ADMIN` 역할이 없으면 로그인할 수 없는지 확인

컨테이너 내부 상태 확인에는 `/api/health`를 사용합니다. 이 경로는 애플리케이션 상태만 반환하며 사용자, 버전, 설정과 백엔드 상태를 노출하지 않습니다.

## 비용과 확장

초기에는 `min=0`, 1 vCPU, 512 MiB를 사용합니다. 관리자가 없는 시간에는 scale-to-zero가 가능하고 첫 접속에는 cold start가 발생할 수 있습니다. 실제 운영에서 첫 접속 지연이 업무를 방해할 때만 `min=1`로 올리고, memory와 동시성은 Cloud Monitoring 수치를 본 뒤 변경합니다.

## 장애 대응

1. GitHub Actions summary에서 배포 image와 이전 image를 확인합니다.
2. Cloud Run revision의 startup/liveness 실패 로그를 확인합니다.
3. API 장애인지 Admin 렌더링 장애인지 분리하기 위해 `/api/health`와 Spring API readiness를 각각 확인합니다.
4. image 문제면 직전 digest로 Cloud Run을 갱신합니다.
5. `API_BASE_URL`, IAP member 또는 scaling 문제면 Terraform plan을 검토한 뒤 적용합니다.

환경 변수나 권한을 콘솔에서 임시 변경했다면 장애 해소 후 Terraform으로 반영하고 drift를 제거합니다.
