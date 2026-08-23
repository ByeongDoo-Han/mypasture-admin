import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_COOKIE, backendUrl } from '../../lib/backend';

const reason = z.string().trim().min(5).max(500);
const generateSchema = z.object({ operationId: z.string().uuid(), regenerate: z.boolean(), reason });
const updateSchema = z.object({
  operationId: z.string().uuid(), verseId: z.number().int().positive(),
  meditation: z.string().trim().min(30).max(1000), actionQuestion: z.string().trim().min(10).max(300), reason,
});
const reviewSchema = z.object({ operationId: z.string().uuid(), reason });

/** Same-origin과 입력을 검증하고 HttpOnly 관리자 JWT로 오늘의 말씀 변경을 대리합니다. */
export async function proxyDailyWordAction(
  request: NextRequest,
  target: { kind: 'generate'; date: string } | { kind: 'update' | 'publish' | 'reject'; id: string },
): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  if (origin && safeHost(origin) !== request.nextUrl.host) return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403 });
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const schema = target.kind === 'generate' ? generateSchema : target.kind === 'update' ? updateSchema : reviewSchema;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: '입력값과 변경 사유를 확인해 주세요.' }, { status: 400 });

  let path: string;
  let method: 'POST' | 'PUT' = 'POST';
  if (target.kind === 'generate') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target.date)) return NextResponse.json({ message: '날짜가 올바르지 않습니다.' }, { status: 400 });
    path = `/api/v1/admin/daily-words/${target.date}/generation-jobs`;
  } else {
    if (!z.string().uuid().safeParse(target.id).success) return NextResponse.json({ message: '대상이 올바르지 않습니다.' }, { status: 400 });
    path = `/api/v1/admin/daily-words/${target.id}${target.kind === 'update' ? '' : `/${target.kind}`}`;
    method = target.kind === 'update' ? 'PUT' : 'POST';
  }
  const backend = await fetch(backendUrl(path), {
    method, headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data), cache: 'no-store', signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!backend) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503 });
  const body = await backend.json().catch(() => ({ message: '오늘의 말씀 요청을 처리하지 못했습니다.' }));
  return NextResponse.json(body, { status: backend.status });
}

function safeHost(origin: string): string | null { try { return new URL(origin).host; } catch { return null; } }
