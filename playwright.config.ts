import { defineConfig, devices } from '@playwright/test';

/** 실제 Next.js BFF와 브라우저를 통해 이메일 OTP 로그인 계약을 확인합니다. */
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4180', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'node scripts/mock-auth-backend.mjs', url: 'http://127.0.0.1:4181/health' },
    { command: 'node node_modules/next/dist/bin/next start -p 4180 -H 127.0.0.1', url: 'http://127.0.0.1:4180/login', env: { APP_ENV: 'local', API_BASE_URL: 'http://127.0.0.1:4181' } },
  ],
});
