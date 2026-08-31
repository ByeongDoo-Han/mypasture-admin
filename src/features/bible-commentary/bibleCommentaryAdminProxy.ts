import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_COOKIE, backendUrl } from '../../lib/backend';

const location = z.object({ version: z.string().trim().min(1).max(40), bookCode: z.string().trim().min(2).max(40), chapter: z.number().int().positive() });
const bookGeneration = location.omit({ chapter: true }).extend({ includePublished: z.boolean() });
const evidence = location.extend({
  chapter: z.number().int().positive().nullable(), evidenceType: z.enum(['HISTORICAL', 'LITERARY', 'THEOLOGICAL']),
  title: z.string().trim().min(2).max(200), content: z.string().trim().min(20).max(4000),
  sourceName: z.string().trim().min(2).max(240),
  sourceUrl: z.string().trim().url().max(1000).refine((value) => value.startsWith('https://'), 'HTTPS 주소만 허용됩니다.').nullable(),
  licenseNote: z.string().trim().min(2).max(500),
});
const section = z.object({ startVerse: z.number().int().positive(), endVerse: z.number().int().positive(), title: z.string().trim().min(1).max(160), explanation: z.string().trim().min(1) });
const reference = z.object({ bookCode: z.string().trim().min(2).max(40), chapter: z.number().int().positive(), verse: z.number().int().positive(), reason: z.string().trim().min(1).max(500) });
const edit = z.object({
  summary: z.string().trim().min(50).max(2000), historicalContext: z.string().trim().min(20).max(3000),
  sections: z.array(section).min(1), keyThemes: z.array(z.string().trim().min(1)).min(1).max(8),
  crossReferences: z.array(reference).max(10), reflectionQuestions: z.array(z.string().trim().min(1)).min(1).max(6),
  cautions: z.array(z.string().trim().min(1)).max(6), reviewNotes: z.string().trim().min(5).max(1000),
});
const publish = z.object({ qualityScore: z.number().int().min(1).max(100), reviewNotes: z.string().trim().min(5).max(1000) });
const reject = z.object({ reviewNotes: z.string().trim().min(5).max(1000) });
const uuid = z.string().uuid();

/** same-origin과 입력 계약을 검증하고 HttpOnly 관리자 JWT로 장별 해설 API를 대리합니다. */
export async function proxyBibleCommentary(request: NextRequest, segments: string[]): Promise<NextResponse> {
  const method = request.method;
  if (method !== 'GET') {
    const origin = request.headers.get('origin');
    if (origin && safeHost(origin) !== request.nextUrl.host) return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403 });
  }
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });

  const target = resolveTarget(request, segments);
  if (!target) return NextResponse.json({ message: '지원하지 않는 장별 해설 요청입니다.' }, { status: 404 });
  const parsed = target.schema ? target.schema.safeParse(await request.json().catch(() => null)) : null;
  if (parsed && !parsed.success) return NextResponse.json({ message: '입력값과 검수 사유를 확인해 주세요.' }, { status: 400 });

  const backend = await fetch(backendUrl(target.path), {
    method: target.method,
    headers: { Authorization: `Bearer ${accessToken}`, ...(target.schema ? { 'Content-Type': 'application/json' } : {}) },
    body: parsed?.success ? JSON.stringify(parsed.data) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(target.timeoutMs ?? 15_000),
  }).catch(() => null);
  if (!backend) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503 });
  if (backend.status === 204) return new NextResponse(null, { status: 204 });
  const body = await backend.json().catch(() => ({ message: '장별 해설 요청을 처리하지 못했습니다.' }));
  return NextResponse.json(body, { status: backend.status });
}

type Target = { path: string; method: 'GET' | 'POST' | 'PUT'; schema?: z.ZodTypeAny; timeoutMs?: number };

function resolveTarget(request: NextRequest, segments: string[]): Target | null {
  if (request.method === 'POST' && segments.join('/') === 'generation-jobs') {
    return { path: '/api/v1/admin/bible-commentaries/generation-jobs', method: 'POST', schema: location };
  }
  if (request.method === 'POST' && segments.join('/') === 'generation-jobs/books') {
    return { path: '/api/v1/admin/bible-commentaries/generation-jobs/books', method: 'POST', schema: bookGeneration, timeoutMs: 30_000 };
  }
  if (segments.length === 1 && segments[0] === 'evidence') {
    if (request.method === 'POST') return { path: '/api/v1/admin/bible-commentaries/evidence', method: 'POST', schema: evidence };
    if (request.method === 'GET') {
      const query = z.object({ version: z.string().min(1), bookCode: z.string().min(2), chapter: z.coerce.number().int().positive() }).safeParse(Object.fromEntries(request.nextUrl.searchParams));
      if (!query.success) return null;
      return { path: `/api/v1/admin/bible-commentaries/evidence?${new URLSearchParams({ ...query.data, chapter: String(query.data.chapter) })}`, method: 'GET' };
    }
  }
  if (segments.length === 3 && segments[0] === 'evidence' && uuid.safeParse(segments[1]).success && ['approve', 'retire'].includes(segments[2]) && request.method === 'POST') {
    return { path: `/api/v1/admin/bible-commentaries/evidence/${segments[1]}/${segments[2]}`, method: 'POST' };
  }
  if (segments.length === 1 && uuid.safeParse(segments[0]).success && request.method === 'PUT') {
    return { path: `/api/v1/admin/bible-commentaries/${segments[0]}`, method: 'PUT', schema: edit, timeoutMs: 20_000 };
  }
  if (segments.length === 2 && uuid.safeParse(segments[0]).success) {
    if (segments[1] === 'reviews' && request.method === 'GET') return { path: `/api/v1/admin/bible-commentaries/${segments[0]}/reviews`, method: 'GET' };
    if (segments[1] === 'publish' && request.method === 'POST') return { path: `/api/v1/admin/bible-commentaries/${segments[0]}/publish`, method: 'POST', schema: publish };
    if (segments[1] === 'reject' && request.method === 'POST') return { path: `/api/v1/admin/bible-commentaries/${segments[0]}/reject`, method: 'POST', schema: reject };
  }
  return null;
}

function safeHost(origin: string): string | null { try { return new URL(origin).host; } catch { return null; } }
