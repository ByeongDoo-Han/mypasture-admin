import 'server-only';
import { z } from 'zod';
import { requireAdminSession } from '../../lib/adminSession';
import { backendUrl } from '../../lib/backend';

export const couponCampaignSchema = z.object({
  id: z.string().uuid(), name: z.string(), eligibilityKey: z.string(),
  codeType: z.enum(['SHARED', 'UNIQUE']), status: z.enum(['ACTIVE', 'INACTIVE']),
  redeemStartsAt: z.string(), redeemEndsAt: z.string(),
  maxRedemptions: z.number().int().positive(), redeemedCount: z.number().int().nonnegative(),
  rewardType: z.literal('PASTURE_DECORATION_ITEM'), rewardItemCode: z.string(), rewardQuantity: z.number().int().positive(), createdAt: z.string(),
});
export const couponCampaignPageSchema = z.object({
  items: z.array(couponCampaignSchema), page: z.number().int().nonnegative(), size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
});
export const createdCouponCampaignSchema = z.object({ campaign: couponCampaignSchema, generatedCodes: z.array(z.string()) });
export type CouponCampaign = z.infer<typeof couponCampaignSchema>;
export type CouponCampaignPage = z.infer<typeof couponCampaignPageSchema>;

/** 관리자 JWT를 서버에 유지하며 이벤트 보상 캠페인 응답을 Zod 계약으로 검증합니다. */
export async function getCouponCampaigns(status?: 'ACTIVE' | 'INACTIVE', page = 0): Promise<CouponCampaignPage> {
  const { accessToken } = await requireAdminSession();
  const query = new URLSearchParams({ page: String(page), size: '20' });
  if (status) query.set('status', status);
  const response = await fetch(backendUrl(`/api/v1/admin/coupon-campaigns?${query}`), {
    headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!response?.ok) throw new Error('쿠폰 캠페인을 불러오지 못했습니다.');
  const parsed = couponCampaignPageSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error('쿠폰 캠페인 응답 형식이 올바르지 않습니다.');
  return parsed.data;
}
