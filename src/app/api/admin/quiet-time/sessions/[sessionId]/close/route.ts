import { NextRequest } from 'next/server';
import { proxyQuietTimeAction } from '../../../../../../../features/quiet-time/quietTimeAdminProxy';

/** 관리자 강제 종료 요청을 백엔드로 전달하는 동일 출처 BFF route입니다. */
export async function POST(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  return proxyQuietTimeAction(request, sessionId, 'close');
}
