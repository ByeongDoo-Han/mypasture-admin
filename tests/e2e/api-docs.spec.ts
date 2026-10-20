import { test, expect } from '@playwright/test';

test('API 문서는 로그인한 관리자에게만 보이고 요청 실행은 비활성화된다', async ({ page }) => {
  await page.goto('/api-docs');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('이메일', { exact: true }).fill('admin@example.test');
  await page.getByRole('button', { name: '로그인 코드 받기' }).click();
  await page.getByLabel('인증 코드', { exact: true }).fill('012345');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'QT 모임 대시보드' })).toBeVisible();

  await page.getByRole('link', { name: 'API 문서' }).click();
  await expect(page.getByRole('heading', { name: 'API 문서' })).toBeVisible();
  await expect(page.getByText('테스트 API')).toBeVisible();
  await page.getByRole('button', { name: 'Expand operation' }).click();
  await expect(page.getByText('테스트 조회')).toBeVisible();
  await expect(page.getByRole('button', { name: /Try it out/i })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('test-access-token');

  const documentResponse = await page.goto('/api-docs');
  expect(documentResponse?.headers()['cache-control']).toContain('no-store');
  const forgedLogout = await page.request.post('/api/auth/logout', { headers: { Origin: 'https://other.example.test' } });
  expect(forgedLogout.status()).toBe(403);
  const logoutResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/auth/logout'));
  await page.getByRole('button', { name: '로그아웃' }).click();
  const logoutResponse = await logoutResponsePromise;
  expect(logoutResponse.status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.context().cookies()).filter((cookie) => cookie.name.includes('mypasture_admin_'))).toHaveLength(0);
  await page.goto('/api-docs');
  await expect(page).toHaveURL(/\/login$/);
});
