import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_COOKIE, backendUrl } from '../../lib/backend';
import { moderationReportSchema } from './moderationAdmin';

const reviewSchema = z.object({
  operationId: z.string().uuid(),
  status: z.enum(['RESOLVED', 'DISMISSED']),
  action: z.enum(['NONE', 'CONTENT_HIDDEN']),
  note: z.string().trim().min(5).max(500),
}).superRefine((value, context) => {
  if (value.status === 'DISMISSED' && value.action !== 'NONE') {
    context.addIssue({ code: 'custom', message: '기각한 신고에는 숨김 조치를 적용할 수 없습니다.' });
  }
});

/** 동일 출처와 관리자 세션을 검증해 신고 처리 요청만 백엔드로 전달합니다. */
export async function proxyModerationReview(request: NextRequest, reportId: string): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  if (origin && safeHost(origin) !== request.nextUrl.host) {
    return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403 });
  }
  if (!z.string().uuid().safeParse(reportId).success) {
    return NextResponse.json({ message: '신고 ID가 올바르지 않습니다.' }, { status: 400 });
  }
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? '처리 요청을 확인해 주세요.' }, { status: 400 });
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const backend = await fetch(backendUrl(`/api/v1/admin/moderation/reports/${reportId}`), {
    method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data), cache: 'no-store', signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!backend) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503 });
  const payload = await backend.json().catch(() => null);
  if (!backend.ok) return NextResponse.json(payload ?? { message: '신고를 처리하지 못했습니다.' }, { status: backend.status });
  const validated = moderationReportSchema.safeParse(payload);
  if (!validated.success) return NextResponse.json({ message: '신고 처리 응답 형식이 올바르지 않습니다.' }, { status: 502 });
  return NextResponse.json(validated.data);
}

function safeHost(origin: string): string | null {
  try { return new URL(origin).host; } catch { return null; }
}
