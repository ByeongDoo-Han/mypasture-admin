const securityHeaders = [
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

if ((process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV) === 'prod') {
  securityHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
}

/** 관리자 화면의 브라우저 공격 표면을 줄이는 공통 응답 헤더입니다. */
export default {
  turbopack: { root: process.cwd() },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
