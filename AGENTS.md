# My Pasture Admin Agent Rules

이 규칙은 `mypasture-admin` 저장소 전체에 적용됩니다.

## 책임

- 회원, 오늘의 말씀, 챌린지, 리워드, 기도제목, 푸시, AI 사용량과 통계를 관리합니다.
- 관리자가 반복 작업을 빠르게 수행할 수 있는 검색, 필터, 표, 상세 편집 흐름을 제공합니다.

## 경로 규칙

- 도메인 화면과 로직은 `src/features/<domain>`에 둡니다.
- 라우팅과 페이지 조합은 `src/app`에 둡니다.
- `src/shared` 변경은 다른 기능 영향과 중복 구현을 먼저 확인합니다.
- API 응답 타입과 화면 전용 모델을 구분합니다.

## 보안과 운영 UX

- ADMIN 권한은 서버에서 최종 검증하며 UI 숨김만으로 보호하지 않습니다.
- 회원 정지, 푸시 발송, 리워드 변경 같은 위험 작업은 대상과 결과를 재확인합니다.
- 대량 작업은 부분 실패와 재시도 결과를 표시합니다.
- 개인정보는 필요한 범위만 표시하고 토큰과 비밀값을 브라우저 로그에 남기지 않습니다.
- `NEXT_PUBLIC_*`에는 공개 값만 넣습니다.

## UI 규칙

- 운영 도구답게 조용하고 밀도 높은 레이아웃을 사용합니다.
- 표, 필터, 페이지네이션, 로딩, 빈 상태, 오류 상태를 기능 완성 범위에 포함합니다.
- 장식용 대형 hero와 카드 중첩을 피합니다.
- 좁은 화면에서도 텍스트와 버튼이 겹치지 않도록 확인합니다.

화면 설계나 독립 UI 검토가 필요한 작업에는 [UI 검토 스킬](.agents/skills/mypasture-ui-review/SKILL.md)을 사용합니다. 구현 Owner와 검토자를 작업 계약에 구분합니다.

## 필수 검증

관리자 변경의 검사와 결과 인수에는 [변경 검증 스킬](.agents/skills/mypasture-change-verification/SKILL.md)을 사용합니다. 스킬은 아래 필수 명령과 CI를 완화하지 않습니다.

```bash
npm run typecheck
npm run build:prod
git diff --check
```

## GitHub 작업 흐름

- 기능 구현 전 GitHub Issue를 만들고 최신 `dev`에서 세부 작업 브랜치를 만듭니다.
- Issue 본문은 `.github/ISSUE_TEMPLATE/feature.md` 구조를 따르는 GitHub Flavored Markdown으로 작성합니다.
- 작업 범위, 완료 조건과 검증 계획은 `- [ ]` 체크박스로 작성하고 실제 줄바꿈을 유지합니다.
- GitHub CLI에서는 본문을 Markdown 파일로 준비해 `gh issue create --body-file <file>`을 사용합니다. 백틱이 포함된 본문을 셸의 `--body` 인자로 직접 전달하지 않습니다.
- 브랜치 이름은 `feat/<domain>-<issue-number>-<feature-slug>` 형식을 사용합니다.
- 커밋은 `feat(<domain>): <summary> (#<issue-number>)` 형식을 기본으로 합니다.
- 세부 작업 PR의 base는 `dev`이며 본문에 `Closes #<issue-number>`를 포함합니다. 검증된 `dev`만 릴리스 PR로 `main`에 병합하고 릴리스 PR에는 CI와 배포 계획을 기록합니다.
- 타입 검사, 운영 빌드와 CI를 통과한 뒤 merge하고 원격 기능 브랜치를 삭제합니다.
- `dev`에서 `main`으로 향하는 PR과 운영 배포는 각각 사람의 별도 승인이 필요합니다. `main` 병합이 Vercel Production 배포를 시작할 수 있으므로 병합 전에 배포 영향도 확인합니다.

## 문서 탐색

작업별 원본 문서는 [문서 색인](docs/README.md)에서 찾습니다. 권한·데이터 정책은 [도메인](docs/domain/README.md), 운영 절차는 [운영](docs/operations/README.md), 검사 근거는 [검증](docs/verification/README.md)과 [작업 기록](docs/tasks/README.md)을 확인합니다. 날짜가 있는 기록은 현재 상태를 대체하지 않습니다.

기능 구현과 기존 기능 개선은 Issue에 문제·목표·완료 조건·검증 계획을 먼저 적고, [작업 기록 양식](docs/tasks/TEMPLATE.md)으로 변경 전후와 실제 검증·PR 상태를 남깁니다. `docs/tasks`는 당시 실행 근거이며 현재 권한·정책은 `docs/domain`의 원본과 코드에서 확인합니다. 여러 에이전트가 참여하면 작업 계약에 구현 Owner, 허용 경로, 검토자, 인수 조건을 지정하고 공유 파일은 한 명만 수정합니다. `ui_designer`는 필요할 때 관리자 UI의 전문 검토자로 참여하며 구현 Owner는 별도로 지정합니다.

## 완료 보고

- 변경한 관리 업무 흐름
- 필요한 권한과 API
- 위험 작업의 확인/감사 정책
- 타입 검사와 운영 빌드 결과
- 백엔드 후속 작업과 잔여 위험
