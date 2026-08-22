import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_COOKIE, backendUrl } from '../../lib/backend';

const actionSchema = z.object({ operationId: z.string().uuid(), reason: z.string().trim().min(5).max(500) });

/** 동일 출처와 요청 형식을 검증한 뒤 HttpOnly 관리자 JWT로 QT 조치 API를 대리 호출하는 BFF 프록시입니다. */
export async function proxyQuietTimeAction(
  request: NextRequest,
  sessionId: string,
  action: 'close' | 'revoke-qr',
): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  if (origin && safeHost(origin) !== request.nextUrl.host) {
    return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403 });
  }
  if (!z.string().uuid().safeParse(sessionId).success) {
    return NextResponse.json({ message: '세션 ID가 올바르지 않습니다.' }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: '조치 사유를 5자 이상 입력해 주세요.' }, { status: 400 });
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const backend = await fetch(backendUrl(`/api/v1/admin/quiet-time/sessions/${sessionId}/${action}`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
    signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!backend) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503 });
  const body = await backend.json().catch(() => ({ message: '요청을 처리하지 못했습니다.' }));
  return NextResponse.json(body, { status: backend.status });
}

function safeHost(origin: string): string | null {
  try { return new URL(origin).host; } catch { return null; }
}
