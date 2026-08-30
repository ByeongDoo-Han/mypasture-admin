import { NextRequest } from 'next/server';
import { proxyCreateCouponCampaign } from '../../../../../features/coupon/couponAdminProxy';

export async function POST(request: NextRequest) { return proxyCreateCouponCampaign(request); }
