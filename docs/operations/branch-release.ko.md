# 관리자 브랜치 통합과 릴리스

1. 최신 `dev`에서 세부 작업 브랜치를 만들고 `dev` 대상 PR을 올립니다. 타입 검사·운영 빌드·CI가 통과하면 병합하고 작업 브랜치를 정리합니다.
2. 릴리스 후보는 `dev → main` PR로 올리고 포함된 Issue/PR, 권한·API·운영 영향, 최종 CI와 배포 계획을 적습니다. `main` PR의 출처는 CI가 `dev`로 제한합니다.
3. `main` PR은 사람의 승인을 받은 뒤 병합합니다. 이 병합은 Vercel Production 배포를 시작할 수 있으므로 배포 승인도 별도로 확인합니다. GCP staging 자동 배포는 `GCP_DEPLOY_ENABLED=true`인 경우에만 시작하고, GCP production은 수동 실행 및 Environment 승인 절차를 따릅니다.
4. 실제 배포 커밋, 로그인 보호 및 핵심 관리자 흐름을 확인합니다. Vercel과 GCP의 배포 상태를 구분해 기록합니다.

2026-11-16 이전의 `dev` 이력은 `archive/dev-before-main-sync-20261116` 태그에 보존했습니다. 현재 `dev`는 당시 최신 `main`에서 다시 시작했습니다.
