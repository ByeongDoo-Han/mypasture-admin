import { test, expect } from '@playwright/test';

const origin = 'http://127.0.0.1:4180';

test('email and leading-zero code create only an HttpOnly administrator session', async ({ page, context }, info) => {
  await page.goto('/login');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByLabel('이메일', { exact: true }).fill('admin@example.test');
  await page.getByRole('button', { name: '로그인 코드 받기' }).click();
  await expect(page.getByLabel('인증 코드', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /초 후 재발송/ })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('email-code.png'), fullPage: true });
  await page.getByLabel('인증 코드', { exact: true }).fill('012345');
  const response = page.waitForResponse((r) => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  expect(result.headers()['cache-control']).toBe('no-store');
  await expect(page.getByRole('heading', { name: 'QT 모임 대시보드' })).toBeVisible();
  const cookies = await context.cookies();
  expect(cookies.filter((c) => c.name.startsWith('mypasture_admin_'))).toHaveLength(2);
  for (const cookie of cookies.filter((c) => c.name.startsWith('mypasture_admin_'))) {
    expect(cookie.httpOnly).toBe(true); expect(cookie.sameSite).toBe('Strict');
  }
  expect(await page.evaluate(() => document.cookie)).not.toContain('test-access-token');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/012345|test-access-token|test-refresh-token/);
});

test('wrong code remains on login and allows retry without creating a session', async ({ page, context }) => {
  await page.goto('/login');
  await page.getByLabel('이메일', { exact: true }).fill('admin@example.test');
  await page.getByRole('button', { name: '로그인 코드 받기' }).click();
  await page.getByLabel('인증 코드', { exact: true }).fill('000000');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('코드를 확인할 수 없습니다');
  expect((await context.cookies()).filter((c) => c.name.startsWith('mypasture_admin_'))).toHaveLength(0);
  await expect(page.getByLabel('인증 코드', { exact: true })).toBeVisible();
});

test('resend cooldown, expiry and changing email have usable recovery paths', async ({ page }) => {
  await page.clock.install();
  await page.goto('/login');
  await page.getByLabel('이메일', { exact: true }).fill('admin@example.test');
  await page.getByRole('button', { name: '로그인 코드 받기' }).click();
  await expect(page.getByLabel('인증 코드', { exact: true })).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(page.getByRole('button', { name: '코드 재발송', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '코드 재발송', exact: true }).click();
  await expect(page.getByRole('button', { name: /초 후 재발송/ })).toBeDisabled();
  await page.clock.fastForward(301_000);
  await expect(page.getByText('코드가 만료되었습니다. 새 코드를 요청해 주세요.')).toBeVisible();
  await page.getByRole('button', { name: '이메일 변경' }).click();
  await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
  await expect(page.getByLabel('인증 코드', { exact: true })).toHaveCount(0);
});

test('backend outage is recoverable and internal error details are hidden', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일', { exact: true }).fill('down@example.test');
  await page.getByRole('button', { name: '로그인 코드 받기' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('코드 요청을 완료하지 못했습니다');
  await expect(page.getByRole('button', { name: '로그인 코드 받기' })).toBeEnabled();
  await expect(page.locator('body')).not.toContainText('internal failure');
});

test('BFF rejects hostile or missing Origin, password payloads and non-admin sessions', async ({ request }) => {
  const rejectedHeaders: Array<Record<string, string>> = [{ Origin: 'https://evil.example' }, {}, { Origin: 'null' }];
  for (const headers of rejectedHeaders) {
    const response = await request.post('/api/auth/login/request', { headers, data: { email: 'admin@example.test' } });
    expect(response.status()).toBe(403);
    expect(response.headers()['set-cookie']).toBeUndefined();
  }
  const oldLogin = await request.post('/api/auth/login', { headers: { Origin: origin }, data: { email: 'admin@example.test', password: 'old-password' } });
  expect(oldLogin.status()).toBe(400);
  const challenge = await request.post('/api/auth/login/request', { headers: { Origin: origin }, data: { email: 'admin@example.test' } });
  const { challengeId } = await challenge.json();
  const forbidden = await request.post('/api/auth/login', { headers: { Origin: origin }, data: { challengeId, code: '111111' } });
  expect(forbidden.status()).toBe(403);
  expect(forbidden.headers()['set-cookie']).toBeUndefined();
  const nextChallenge = await request.post('/api/auth/login/request', { headers: { Origin: origin }, data: { email: 'admin@example.test' } });
  const confirmed = await request.post('/api/auth/login', { headers: { Origin: origin }, data: { challengeId: (await nextChallenge.json()).challengeId, code: '012345' } });
  expect(confirmed.status()).toBe(200);
  expect(Object.keys(await confirmed.json())).toEqual(['user']);
  expect(confirmed.headers()['cache-control']).toBe('no-store');
});
