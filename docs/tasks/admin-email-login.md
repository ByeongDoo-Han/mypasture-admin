# 관리자 이메일 코드 로그인 인수인계

## 작업 정보

- Issue: #49
- 브랜치: `feat/auth-49-admin-email-login`
- 연동 서버 Issue: mypasture-backend #140

## 관리 업무 흐름

`/login`에서 이메일을 입력해 코드를 요청하고 6자리 코드를 확인합니다. 기존 비밀번호 입력과 비밀번호 BFF는 제거했습니다. 로그인 요청은 실제 발송 여부를 드러내지 않는 안내를 보여줍니다. 60초 재발송 대기, 5분 만료, 잘못된 코드, 서버 장애, 재발송과 이메일 변경을 처리합니다. `012345`처럼 앞에 0이 있는 코드도 문자열로 유지합니다.

브라우저는 `POST /api/auth/login/request`와 `POST /api/auth/login`만 호출합니다. BFF는 각각 서버 `/api/v1/auth/admin-email-login/requests`, `/confirm`으로 전달하며 응답 계약을 검증합니다. 서버가 ADMIN 세션을 반환했을 때만 기존 HttpOnly/SameSite=Strict 쿠키를 발급합니다. 운영에서는 Secure와 `__Host-` 접두사를 사용합니다. JSON에는 필요한 user 필드만 반환하며 인증 토큰은 노출하지 않습니다.

요청은 JSON과 정확한 동일 Origin을 요구합니다. Next.js의 localhost 정규화 문제를 피하기 위해 원본 Host를 검증하고, 운영에서는 외부 HTTPS를 강제합니다. 임의 `X-Forwarded-Host`를 신뢰하지 않습니다. 모든 로그인 응답은 no-store입니다. API timeout은 15초이며 redirect를 따르지 않습니다.

## 변경 파일

- `src/features/auth/`: 코드 입력 UI, Zod 계약, 동일 Origin 및 서버 응답 검증/BFF.
- `src/app/login/page.tsx`, `src/app/api/auth/login/**`: 화면과 라우트.
- `tests/admin-email-login.test.mjs`: 입력/응답/NextRequest 실제 정규화 회귀 검사.
- `tests/e2e/admin-login.spec.ts`, `playwright.config.ts`, `scripts/mock-auth-backend.mjs`: 실제 Next BFF와 데스크톱/모바일 브라우저 통합 검사. 외부 API와 메일은 로컬 mock으로 대체.
- CI: 계약 검사와 Playwright 추가. 기존 타입/빌드/audit/컨테이너 검증 유지.
- 의존성: Playwright 추가; CI audit에서 발견된 취약점을 해소하도록 Next.js 16.3.5 및 sharp 0.35.4로 lockfile 패치 갱신.

## 검증

- `npm run typecheck`, `npm test`(6건), `npm run build:prod` 통과.
- `npm run test:e2e` 10건 통과: desktop/mobile 각각 정상 로그인, 오류, 재발송/만료, 장애, 잘못된 Origin/비밀번호 요청 및 비관리자 세션 거부.
- `npm audit --omit=dev --audit-level=high` 취약점 0건, `git diff --check` 통과.
- mock 기반 검증은 실제 운영 SMTP 수신과 운영 로그인을 보장하지 않습니다.

## 운영 상태와 후속 작업

지정 계정의 운영 관리자 승격은 서버 작업에서 완료했습니다. 이메일 코드 기능은 아직 운영에 배포하지 않았습니다. Cloudflare 유료 발송 대신 Resend를 선택했습니다. 2026-09-22에 GCP Secret 저장, 발송 도메인 Verified, TLS/SMTP 인증 및 지정 관리자 대상 테스트 메일 Delivered를 확인했습니다. 백엔드 기능 활성화가 완료되기 전에 이 UI를 운영 배포하면 로그인할 수 없습니다.

백엔드 V42 배포, SMTP/HMAC Secret 설정, 실제 발송/코드 확인을 먼저 완료해야 합니다. 이후 관리자 `main` 대상 PR과 운영 배포에 대한 별도 승인을 받아 진행합니다. 운영 사이트는 Vercel `mypasture-admin` 프로젝트에 연결되어 있습니다. 문제 시 이전 관리자 배포로 되돌리고 서버 기능을 비활성화합니다.

일반 사용자 모바일 앱 변경은 필요 없습니다. 이메일 인증은 단일 요소 인증이며 TOTP/MFA를 제공하지 않습니다.
