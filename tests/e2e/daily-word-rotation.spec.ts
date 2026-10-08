import { test, expect } from '@playwright/test';

test.beforeEach(async({request,context})=>{
  await request.get('http://127.0.0.1:4181/__daily-word-fixture?unavailable=false');
  // 기존 BFF 로그인 회귀는 admin-login.spec에서 실행하며 여기서는 SSR의 기존 ADMIN 확인을 재사용합니다.
  await context.addCookies([{name:'mypasture_admin_access',value:'test-access-token',domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict'}]);
});

test('automatic themed and continuous ranges preserve full Scripture and distinguish absent admin review',async({page},info)=>{
  await page.goto('/daily-words');
  await expect(page.getByRole('heading',{name:'자동 게시 · 예외 복구',exact:true})).toBeVisible();
  const words=page.locator('article');await expect(words).toHaveCount(3);
  await expect(words.nth(0).getByRole('heading',{name:'시편 23:1–3',exact:true})).toBeVisible();
  await expect(words.nth(0)).toContainText('자동 본문 · 요일별 말씀 · 소망 · 시·지혜 · 일일 관리자 검수 없음');
  await expect(words.nth(1)).toContainText('자동 본문 · 성경 함께 읽기 · 이야기 · 일일 관리자 검수 없음');
  await expect(words.nth(0)).toContainText('3 내 영혼을 소생시키시고');
  await expect(words.nth(0).getByRole('button',{name:'게시',exact:true})).toHaveCount(0);
  await expect(words.nth(2).getByRole('heading',{name:'시편 23:1',exact:true})).toBeVisible();
  await expect(words.nth(2)).toContainText('AI 초안 · 관리자 검수 기록 없음');
  await expect(words.nth(2).getByRole('button',{name:'게시',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('admin-daily-rotation.png'),fullPage:true});
});

test('automatic publication does not require daily AI generation and existing exceptional tools remain available',async({page})=>{
  await page.goto('/daily-words');
  await expect(page.getByRole('button',{name:'초안 생성',exact:true})).not.toBeVisible();
  await page.getByText('기존 AI 초안 도구',{exact:true}).click();
  await expect(page.getByText(/자동 순환 중에는 AI 초안 생성 요청이 허용되지 않습니다/)).toBeVisible();
  await expect(page.getByRole('button',{name:'초안 생성',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'수동 복구 초안',exact:true})).toBeVisible();
});

test('SSR public-data outage is explicit and reload recovers without changing authorization',async({page,request})=>{
  await request.get('http://127.0.0.1:4181/__daily-word-fixture?unavailable=true');
  await page.goto('/daily-words');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('운영 데이터를 불러오지 못했습니다');
  await request.get('http://127.0.0.1:4181/__daily-word-fixture?unavailable=false');
  await page.getByRole('link',{name:'다시 불러오기',exact:true}).click();
  await expect(page.getByRole('heading',{name:'자동 게시 · 예외 복구',exact:true})).toBeVisible();
});
