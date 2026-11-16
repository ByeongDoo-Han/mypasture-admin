---
name: mypasture-change-verification
description: Verify and report My Pasture admin changes with the required type check, production build, diff check, relevant UI or contract checks, and final PR CI.
---

# 관리자 변경 검증

[저장소 규칙](../../../AGENTS.md)과 [검증 색인](../../../docs/verification/README.md)을 현재 diff·커밋에 적용한다. 이 스킬은 기존 필수 검사를 실행하고 결과를 인계하는 절차다.

1. 변경된 화면·권한·API 호출자·공유 컴포넌트를 파악하고 위험과 인접 회귀를 적는다. 회원 정지·푸시·리워드 등 위험 작업이면 대상 재확인, 권한, 부분 실패와 재시도를 포함한다.
2. `npm run typecheck`, `npm run build:prod`, `git diff --check`를 저장소 규칙대로 실행한다. 실제 UI·API 영향에 맞는 브라우저·계약 검사를 선택하고 실행 환경이 없으면 미검증으로 남긴다. 문서만 바뀌어 앱 테스트가 0개여도 필수 타입·빌드 검사는 생략하지 않는다.
3. [작업 기록](../../../docs/tasks/TEMPLATE.md)에 명령, 커밋·환경, 발견·통과·실패 수, 선택·제외 이유와 남은 위험을 기록한다. 실패나 미실행을 통과로 표시하지 않는다.
4. PR 최종 커밋의 CI와 Vercel Preview를 확인하고 `dev` 병합, `main` 릴리스 병합, Production 배포를 각각 구분한다. 관련 소스·설정·환경이 바뀌면 영향받는 검사를 다시 실행한다.

이 스킬은 `main` 병합이나 배포 권한을 부여하지 않는다. 승인 기준은 AGENTS.md와 사용자 요청을 따른다.
