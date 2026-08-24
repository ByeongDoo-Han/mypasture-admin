import type { NextRequest } from 'next/server';
import { proxyDailyWordAction } from '../../../../../../features/daily-word/dailyWordAdminProxy';

/** 관리자 수동 초안 요청을 백엔드로 전달합니다. */
export async function POST(request: NextRequest, context: { params: Promise<{ date: string }> }) {
  return proxyDailyWordAction(request, { kind: 'manual', date: (await context.params).date });
}
