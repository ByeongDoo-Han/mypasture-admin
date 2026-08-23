import { NextRequest } from 'next/server';
import { proxyDailyWordAction } from '../../../../../../features/daily-word/dailyWordAdminProxy';

/** 게시 확인 요청을 관리자 백엔드로 전달합니다. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return proxyDailyWordAction(request, { kind: 'publish', id: (await context.params).id });
}
