import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_COOKIE, backendUrl } from '../../lib/backend';

const responseSchema = z.object({
  results: z.array(z.object({
    version: z.string(), bookCode: z.string(), bookName: z.string(), chapter: z.number().int().positive(),
    verse: z.number().int().positive(), text: z.string(),
  })),
});

/** 수동 복구 화면의 짧은 성경 검색을 검증해 백엔드 공개 API로 전달합니다. */
export async function proxyBibleSearch(request: NextRequest): Promise<NextResponse> {
  if (!request.cookies.get(ACCESS_COOKIE)?.value) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const keyword = request.nextUrl.searchParams.get('keyword')?.trim() ?? '';
  const version = request.nextUrl.searchParams.get('version')?.trim().toUpperCase() ?? 'KOR1910';
  if (keyword.length < 2 || keyword.length > 50 || !/^[A-Z0-9_-]{2,20}$/.test(version)) {
    return NextResponse.json({ message: '검색어는 2자에서 50자 사이여야 합니다.' }, { status: 400 });
  }
  const backend = await fetch(
    backendUrl(`/api/v1/bibles/${encodeURIComponent(version)}/search?keyword=${encodeURIComponent(keyword)}&page=0&size=20`),
    { cache: 'no-store', signal: AbortSignal.timeout(7_000) },
  ).catch(() => null);
  if (!backend) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503 });
  const parsed = responseSchema.safeParse(await backend.json().catch(() => null));
  if (!backend.ok || !parsed.success) return NextResponse.json({ message: '성경 검색 결과를 불러오지 못했습니다.' }, { status: backend.ok ? 502 : backend.status });
  return NextResponse.json(parsed.data.results);
}
