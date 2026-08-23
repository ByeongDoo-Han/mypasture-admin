import { NextRequest } from 'next/server';
import { proxyDailyWordAction } from '../../../../../../features/daily-word/dailyWordAdminProxy';

/** 날짜별 생성 요청을 관리자 백엔드로 전달합니다. */
export async function POST(request: NextRequest, context: { params: Promise<{ date: string }> }) {
  return proxyDailyWordAction(request, { kind: 'generate', date: (await context.params).date });
}
