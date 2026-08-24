import type { NextRequest } from 'next/server';
import { proxyDailyWordAction } from '../../../../../../../features/daily-word/dailyWordAdminProxy';

/** 운영 사건 확인 요청을 백엔드로 전달합니다. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return proxyDailyWordAction(request, { kind: 'acknowledge', id: (await context.params).id });
}
