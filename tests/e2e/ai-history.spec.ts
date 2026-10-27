import { expect, test } from '@playwright/test';

test('관리자는 열람 목적을 고른 뒤에만 AI 답변을 보고 원문은 캐시하지 않는다', async ({ page }) => {
  await page.goto('/ai-history');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('이메일', { exact: true }).fill('admin@example.test');
  await page.getByRole('button', { name: '로그인 코드 받기' }).click();
  await page.getByLabel('인증 코드', { exact: true }).fill('012345');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'QT 모임 대시보드' })).toBeVisible();
  const pageResponse = await page.goto('/ai-history');
  expect(pageResponse?.headers()['cache-control']).toContain('no-store');
  await expect(page.getByRole('heading', { name: '질문·답변 기록' })).toBeVisible();
  await expect(page.getByText('member@example.test')).toBeVisible();
  await expect(page.getByText('기도에 대해 묻고 싶어요')).toBeVisible();
  await expect(page.getByText('기도는 마음을 하나님께 드리는 시간입니다.')).toHaveCount(0);
  await page.getByRole('button', { name: '질문·답변 보기' }).click();
  await expect(page.getByText('열람 목적을 선택해 주세요.')).toBeVisible();
  await page.getByLabel('열람 목적').selectOption('QUALITY_REVIEW');
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/admin/ai/history/') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '질문·답변 보기' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
  await expect(page.getByText('기도는 마음을 하나님께 드리는 시간입니다.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByText('기도는 마음을 하나님께 드리는 시간입니다.')).toHaveCount(0);
});

test('AI 기록 상세 BFF는 외부 출처와 잘못된 목적을 차단한다', async ({ request }) => {
  const path = '/api/admin/ai/history/e5f4f12e-315f-4cc9-91a4-182e8c42d619/review';
  const forged = await request.post(path, { headers: { Origin: 'https://other.example.test' }, data: { reason: 'QUALITY_REVIEW' } });
  expect(forged.status()).toBe(403);
  const invalid = await request.post(path, { headers: { Origin: 'http://127.0.0.1:4180' }, data: { reason: 'OTHER' } });
  expect(invalid.status()).toBe(400);
  expect(invalid.headers()['cache-control']).toContain('no-store');
  const anonymous = await request.post(path, { headers: { Origin: 'http://127.0.0.1:4180' }, data: { reason: 'QUALITY_REVIEW' } });
  expect(anonymous.status()).toBe(401);
});
