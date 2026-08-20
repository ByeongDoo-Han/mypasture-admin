import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_COOKIE, REFRESH_COOKIE, backendUrl, secureCookie, type AdminUser } from '../../../../lib/backend';

const schema = z.object({ email: z.string().email().max(320), password: z.string().min(8).max(72) });

/** 관리자 자격을 백엔드에서 확인한 뒤 JWT를 HttpOnly 쿠키에만 저장합니다. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: '이메일과 비밀번호를 확인해 주세요.' }, { status: 400 });

  const backend = await fetch(backendUrl('/api/v1/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
    signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!backend?.ok) return NextResponse.json({ message: '로그인 정보를 확인해 주세요.' }, { status: backend?.status === 401 ? 401 : 503 });

  const session = await backend.json() as {
    token: string; refreshToken: string; expiresIn: number; user: AdminUser;
  };
  if (session.user.role !== 'ADMIN') return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });

  const response = NextResponse.json({ user: session.user });
  const common = { httpOnly: true, secure: secureCookie(), sameSite: 'strict' as const, path: '/' };
  response.cookies.set(ACCESS_COOKIE, session.token, { ...common, maxAge: session.expiresIn });
  response.cookies.set(REFRESH_COOKIE, session.refreshToken, { ...common, maxAge: 60 * 60 * 24 * 30 });
  return response;
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || new URL(origin).host === request.nextUrl.host;
}
