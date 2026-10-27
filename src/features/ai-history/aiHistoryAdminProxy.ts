import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { ACCESS_COOKIE, backendUrl } from '../../lib/backend';
import { aiHistoryDetailSchema } from './aiHistoryAdmin';

const reviewRequestSchema = z.object({ reason: z.enum(['QUALITY_REVIEW', 'SAFETY_REVIEW', 'USER_SUPPORT']) });
const noStore = { 'Cache-Control': 'no-store, private', Pragma: 'no-cache' };

/** 민감한 답변 상세 요청만 관리자 API로 중계하고 응답을 캐시하지 않습니다. */
export async function proxyAiHistoryReview(request: NextRequest, turnId: string): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  try {
    if (!origin || !host || new URL(origin).host !== host) return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403, headers: noStore });
  } catch { return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403, headers: noStore }); }
  if (!z.string().uuid().safeParse(turnId).success) return NextResponse.json({ message: '기록 ID가 올바르지 않습니다.' }, { status: 400, headers: noStore });
  const parsedRequest = reviewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedRequest.success) return NextResponse.json({ message: '열람 목적을 선택해 주세요.' }, { status: 400, headers: noStore });
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401, headers: noStore });
  const response = await fetch(backendUrl(`/api/v1/admin/ai/history/${turnId}/review`), {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parsedRequest.data), cache: 'no-store', signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!response) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503, headers: noStore });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ message: '기록을 열람하지 못했습니다.' }, { status: response.status, headers: noStore });
  const detail = aiHistoryDetailSchema.safeParse(payload);
  if (!detail.success) return NextResponse.json({ message: '기록 응답 형식이 올바르지 않습니다.' }, { status: 502, headers: noStore });
  return NextResponse.json(detail.data, { headers: noStore });
}
