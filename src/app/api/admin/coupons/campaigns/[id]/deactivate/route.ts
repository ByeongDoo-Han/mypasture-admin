import { NextRequest } from 'next/server';
import { proxyDeactivateCouponCampaign } from '../../../../../../../features/coupon/couponAdminProxy';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return proxyDeactivateCouponCampaign(request, (await context.params).id);
}
