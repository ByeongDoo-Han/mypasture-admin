import { NextRequest } from 'next/server';
import { proxyDailyWordAction } from '../../../../../../features/daily-word/dailyWordAdminProxy';

/** 초안 편집 요청을 관리자 백엔드로 전달합니다. */
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return proxyDailyWordAction(request, { kind: 'update', id: (await context.params).id });
}
