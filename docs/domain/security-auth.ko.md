# 관리자 인증·권한 정책

## 적용 내용

- 브라우저는 백엔드 JWT를 직접 저장하거나 읽지 않는다.
- Next.js BFF 로그인 route가 백엔드의 이메일 로그인을 호출하고 `ADMIN` 역할만 허용한다.
- access/refresh token은 `HttpOnly`, `SameSite=Strict`, 운영 `Secure` 쿠키에 저장한다.
- 대시보드는 매 요청마다 서버에서 `/api/v1/auth/me`를 호출해 활성 계정과 `ADMIN` 역할을 재검증한다.
- 로그아웃은 백엔드 token family와 인증 버전을 폐기한 뒤 쿠키를 제거한다.
- CSP, frame 차단, MIME sniffing 차단, referrer 및 browser permission 정책을 응답에 추가한다.
- Next.js 16.3.1로 업데이트했고 현재 `npm audit` 결과는 0건이다.

## 운영 주의사항

- `APP_ENV=prod`, `API_BASE_URL=https://...`를 서버 환경변수로만 주입한다.
- 관리자 앱과 백엔드는 TLS 뒤에서 실행한다.
- access token 만료 시 현재는 재로그인한다. 자동 갱신 BFF를 추가할 때도 refresh token을 브라우저 JavaScript에 노출하지 않는다.
