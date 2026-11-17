import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('이메일', { exact: true }).fill('admin@example.test');
  await page.getByRole('button', { name: '로그인 코드 받기' }).click();
  await page.getByLabel('인증 코드', { exact: true }).fill('012345');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'QT 모임 대시보드' })).toBeVisible();
}

test('QT list keeps status, counts and detail link visible at narrow widths', async ({ page }, info) => {
  await login(page);
  await page.goto('/quiet-time');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    const item = page.getByRole('article').filter({ hasText: '주일 저녁 말씀 나눔' });
    await expect(item.getByRole('link', { name: '주일 저녁 말씀 나눔' })).toHaveAttribute('href', /\/quiet-time\/11111111/);
    await expect(item.getByText('진행 중')).toBeVisible();
    await expect(item.getByText('12명')).toBeVisible();
    await expect(item.getByText('8개')).toBeVisible();
    await expect(page.locator('table')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`qt-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('table')).toBeVisible();
  await expect(page.locator('table').getByText('12')).toBeVisible();
  await page.getByRole('textbox', { name: '세션 검색' }).fill('empty');
  await page.getByRole('button', { name: '검색' }).click();
  await expect(page.getByText('조건에 맞는 QT 모임이 없습니다.').filter({ visible: true })).toBeVisible();
  await page.getByRole('textbox', { name: '세션 검색' }).fill('outage');
  await page.getByRole('button', { name: '검색' }).click();
  await expect(page.getByRole('alert').filter({ hasText: '세션 목록을 불러오지 못했습니다' })).toBeVisible();
});

test('notification list exposes each delivery metric at narrow widths', async ({ page }, info) => {
  await login(page);
  await page.goto('/notifications');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    const item = page.getByRole('article').filter({ hasText: '긴 알림 내용을' });
    await expect(item.getByText('Provider 접수')).toBeVisible();
    await expect(item.getByText('110건')).toBeVisible();
    await expect(item.getByText('앱 수신')).toBeVisible();
    await expect(item.getByText('최종 실패')).toBeVisible();
    await expect(item.getByText('2건')).toBeVisible();
    await expect(page.locator('table')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`notifications-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('table')).toBeVisible();
  await expect(page.locator('table').getByText('오늘의 말씀', { exact: true }).first()).toBeVisible();
  await page.getByLabel('시작일').fill('2026-11-17');
  await page.getByLabel('종료일').fill('2026-11-16');
  await page.getByRole('button', { name: '조회' }).click();
  await expect(page.getByRole('status')).toContainText('조회 시작일은 종료일보다 늦을 수 없습니다');
  await page.getByLabel('시작일').fill('2026-11-18');
  await page.getByLabel('종료일').fill('2026-11-18');
  await page.getByRole('button', { name: '조회' }).click();
  await expect(page.getByText('조건에 맞는 알림이 없습니다.').filter({ visible: true })).toBeVisible();
  await page.getByLabel('시작일').fill('2026-11-19');
  await page.getByLabel('종료일').fill('2026-11-19');
  await page.getByRole('button', { name: '조회' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.getByLabel('시작일').fill('2026-11-16');
  await page.getByLabel('종료일').fill('2026-11-16');
  await page.getByRole('button', { name: '조회' }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.locator('table').getByText('오늘의 말씀', { exact: true }).first()).toBeVisible();
});
