# Daily Word #56 — CR005 보안 의존성 패치

- 작업: 서버 작업 계약 `169-daily-word-rotation.md`, 관리자 Issue #56 / PR #57
- 작성자: 앱·관리자 구현 Agent (`verse_card`)
- 결정: Lead 수락 (2026-10-09). 주요 의존성 변경으로 관리자 검증 위험도는 고위험.

## Change Request CR005

| 항목 | 내용 |
| --- | --- |
| Current | Next 16.3.5, sharp 0.35.4, source-map-js 1.2.1. 최종 CI production audit가 critical/high 취약점으로 실패한다. |
| Proposed | Next 16.3.8, sharp 0.35.5, source-map-js 1.2.2. Next 최소 버전 범위를 `^16.3.8`로 올리고 기존 범위가 허용하는 두 전이 의존성을 lockfile에서 갱신한다. Next의 일치하는 `@next/env`/SWC 및 sharp의 필수 플랫폼 패키지만 함께 갱신한다. |
| Reason | 기능 변경과 무관한 기존 실행 의존성 취약점이 필수 CI를 차단한다. 불필요한 업그레이드를 제외하고 취약점 수정에 필요한 기존 minor의 패치만 적용한다. |
| Impact | Next 빌드·실행과 이미지 처리/소스맵 전이 의존성. React, 프레임워크 major, API 계약, 인증, 화면 기능, audit 기준과 CI 정책은 변경하지 않는다. |
| Compatibility | 기존 Node >=20.9.0 요구사항 유지. CI와 Docker Node 22에서 확인한다. sharp는 Next의 `^0.35.4` 범위에 포함되며 source-map-js도 기존 postcss 범위에 포함된다. |

## 근거

- npm audit 원본: 로컬 evidence `admin-production-audit-before.json` (종료 코드 1).
- npm registry 원본: `admin-next-patched-registry.json`, `admin-sharp-patched-registry.json`, `admin-sourcemap-patched-registry.json` (각 종료 코드 0).
- [Next 16.3.8 공식 릴리스](https://github.com/vercel/next.js/releases/tag/v16.3.8): 해당 보안 수정 포함.
- [Next critical advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j), [Next 16.3.8 수정 advisory](https://github.com/advisories/GHSA-3w37-wq28-93x7).
- [sharp 0.35.5 수정 advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
- [source-map-js 1.2.2 수정 advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

## 검증·완료 조건

- [x] 실제 package/lock diff가 수락 범위 안에 있음.
- [x] `git diff --check`, 관리자 전체 unit 11건, typecheck, production build 통과.
- [x] 관리자 전체 E2E 16건 통과.
- [x] `npm audit --omit=dev --audit-level=high` 통과 및 production 취약점 0 확인.
- [x] 표준 Docker build와 비root runner `/api/health` smoke 통과.
- [ ] 변경 후 독립 QA/Review 완료 및 최종 커밋의 전체 CI 통과.

검증 원본은 `/private/tmp/mypasture-daily-rotation-20261009/evidence`에 보존한다. 병합·운영 배포는 이 변경 작업에 포함하지 않는다.

## 실행 기록

- `npm ci`로 lockfile 재현 후 unit/type/build/audit는 종료 코드 0. 실제 최종 설치 버전은 Next 16.3.8 / sharp 0.35.5 / source-map-js 1.2.2이다. 기능 코드와 테스트 fixture는 변경하지 않았다.
- Docker 첫 실행은 sandbox의 buildx activity 기록 쓰기 제한으로 실패했다. 동일 표준 명령을 승인된 경로에서 재실행해 Node 22 이미지 build와 `nextjs` runner의 health `UP`를 확인했다. 로컬 검증 전용 컨테이너는 정리했다.
- E2E 첫 실행은 Chromium 1243 실행 파일 누락으로 브라우저 14건 실패, request 검사 2건 통과였다. 공식 browser install의 full Chrome과 only-shell 시도가 Data 볼륨 여유 공간 부족(ENOSPC)으로 실패했다. Lead가 이 작업의 사용하지 않는 임시 모바일 `node_modules`만 정리한 후, 공식 `npx playwright install chromium --only-shell`이 동일 revision 1243을 정상 설치했다. 브라우저 버전·E2E 설정·CI 정책은 변경하지 않았다.
- 최종 `npm run test:e2e -- --reporter=json`은 종료 코드 0, 16 통과 / 0 실패 / 0 건너뜀 / 0 flaky (10.046832초). 새 원본은 `admin-e2e-approved.json`이며 이전 통과/환경 실패 원본은 별도로 보존했다.
- 명령·종료 코드·원본 경로·dependency diff·내용 해시는 로컬 `admin-security-results.json`, `admin-security-dependency.diff`로 고정했다.
