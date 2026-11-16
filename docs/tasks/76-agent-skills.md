# 작업 기록: #76 관리자 검증·UI 검토 스킬

## 계획과 근거

- 종류: 개발 절차 개선
- Issue: [#76](https://github.com/ByeongDoo-Han/mypasture-admin/issues/76)
- 기존 상태: 필수 타입·운영 빌드·CI와 UI 규칙은 있으나 서브에이전트가 결과를 인계하는 프로젝트 스킬이 없었다.
- 목표: 관리자 변경 검증과 화면·권한·부분 실패 상태의 전문 검토 절차를 제공한다.
- Owner·허용 경로: 관리자 문서 담당 / `AGENTS.md`, `.agents/skills/**`, `docs/tasks/**`

## 실제 변경

- `mypasture-change-verification`: 타입·운영 빌드·diff와 관련 UI/계약 검사, 최종 CI 인수.
- `mypasture-ui-review`: 표·필터·상세 편집, 권한 민감 작업, 로딩·빈·오류·부분 실패와 좁은 화면 검토.
- `AGENTS.md`에 발동 조건과 구현 Owner·`ui_designer` 검토 관계를 연결했다.
- 실행 코드·API·권한·DB·환경변수·운영 설정 영향 없음.

## 검증

- `quick_validate.py`: 스킬 2/2 유효.
- 상대 Markdown 링크: 누락 0개.
- `npm run typecheck`: 통과.
- `npm run build:prod`: 통과. `.env.prod.example`을 복사한 로컬 설정, 정적 페이지 22개 생성.
- `git diff --check`: 통과.
- 앱 테스트: 실행 코드 변경이 없어 0개. 관리자 필수 타입·빌드는 실행했다.

## 단계

| 단계 | 작성 시점 상태 |
| --- | --- |
| 로컬 구현·검증 | 위 검사 완료 |
| PR 최종 커밋 CI·Vercel Preview | 미실행 |
| `dev` 병합 | 미실행 |
| `main` 병합·Production 배포 | 미실행 |

이후 상태는 이슈와 PR의 최신 커밋·CI에서 확인한다.
