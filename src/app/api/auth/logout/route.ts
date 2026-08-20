import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, backendUrl, secureCookie } from '../../../../lib/backend';

/** 백엔드 세션을 폐기한 뒤 관리자 쿠키를 항상 제거합니다. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== request.nextUrl.host) {
    return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403 });
  }
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let logoutStatus: number | undefined;
  if (accessToken) {
    const logoutResponse = await fetch(backendUrl('/api/v1/auth/logout'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    }).catch(() => null);
    logoutStatus = logoutResponse?.status;
  }
  if ((!accessToken || logoutStatus === 401) && refreshToken) {
      const refreshResponse = await fetch(backendUrl('/api/v1/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      }).catch(() => null);
      if (refreshResponse?.ok) {
        accessToken = ((await refreshResponse.json()) as { token: string }).token;
        await fetch(backendUrl('/api/v1/auth/logout'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(5_000),
        }).catch(() => undefined);
      }
  }
  const response = NextResponse.json({ ok: true });
  const expired = { httpOnly: true, secure: secureCookie(), sameSite: 'strict' as const, path: '/', maxAge: 0 };
  response.cookies.set(ACCESS_COOKIE, '', expired);
  response.cookies.set(REFRESH_COOKIE, '', expired);
  return response;
}
