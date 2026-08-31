import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_COOKIE, backendUrl } from '../../lib/backend';
import { couponCampaignSchema, createdCouponCampaignSchema } from './couponAdmin';

const createSchema = z.object({
  operationId: z.string().uuid(), name: z.string().trim().min(2).max(100), eligibilityKey: z.string().trim().min(2).max(80),
  codeType: z.enum(['SHARED', 'UNIQUE']), redeemStartsAt: z.string().datetime(), redeemEndsAt: z.string().datetime(),
  maxRedemptions: z.number().int().min(1).max(1_000_000).nullable(), codeCount: z.number().int().min(1).max(1_000).nullable(),
  sharedCode: z.string().trim().min(8).max(40).nullable(), entitlementDurationDays: z.number().int().min(1).max(90),
  aiDailyLimit: z.number().int().min(1).max(500), reason: z.string().trim().min(5).max(500),
}).superRefine((value, context) => {
  if (new Date(value.redeemEndsAt) <= new Date(value.redeemStartsAt)) context.addIssue({ code: 'custom', message: '종료 시각은 시작 시각보다 뒤여야 합니다.' });
  if (value.codeType === 'SHARED' && value.maxRedemptions === null) context.addIssue({ code: 'custom', message: '공유 쿠폰 한도가 필요합니다.' });
  if (value.codeType === 'UNIQUE' && value.codeCount === null) context.addIssue({ code: 'custom', message: '개별 쿠폰 수량이 필요합니다.' });
});

/** 브라우저 입력을 재검증하고 HttpOnly 관리자 JWT로 캠페인 생성 요청을 대리합니다. */
export async function proxyCreateCouponCampaign(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? '캠페인 입력값을 확인해 주세요.' }, { status: 400 });
  return relay('/api/v1/admin/coupon-campaigns', accessToken, parsed.data, createdCouponCampaignSchema);
}

/** 중지 사유와 멱등 키를 검증한 뒤 캠페인 신규 등록을 차단합니다. */
export async function proxyDeactivateCouponCampaign(request: NextRequest, id: string): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const idResult = z.string().uuid().safeParse(id);
  const bodyResult = z.object({ operationId: z.string().uuid(), reason: z.string().trim().min(5).max(500) }).safeParse(await request.json().catch(() => null));
  if (!idResult.success || !bodyResult.success) return NextResponse.json({ message: '중지 요청을 확인해 주세요.' }, { status: 400 });
  return relay(`/api/v1/admin/coupon-campaigns/${id}/deactivate`, accessToken, bodyResult.data, couponCampaignSchema);
}

async function relay(path: string, accessToken: string, body: unknown, schema: z.ZodType): Promise<NextResponse> {
  const backend = await fetch(backendUrl(path), {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!backend) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503 });
  const payload = await backend.json().catch(() => null);
  if (!backend.ok) return NextResponse.json(payload ?? { message: '쿠폰 요청을 처리하지 못했습니다.' }, { status: backend.status });
  const validated = schema.safeParse(payload);
  if (!validated.success) return NextResponse.json({ message: '쿠폰 API 응답 형식이 올바르지 않습니다.' }, { status: 502 });
  return NextResponse.json(validated.data);
}
