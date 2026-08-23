import { NextRequest } from 'next/server';
import { proxyDailyWordAction } from '../../../../../../features/daily-word/dailyWordAdminProxy';

/** 반려 확인 요청을 관리자 백엔드로 전달합니다. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return proxyDailyWordAction(request, { kind: 'reject', id: (await context.params).id });
}
