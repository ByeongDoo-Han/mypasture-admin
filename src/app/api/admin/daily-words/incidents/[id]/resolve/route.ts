import type { NextRequest } from 'next/server';
import { proxyDailyWordAction } from '../../../../../../../features/daily-word/dailyWordAdminProxy';

/** 운영 사건 해결 요청을 백엔드로 전달합니다. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return proxyDailyWordAction(request, { kind: 'resolve', id: (await context.params).id });
}
