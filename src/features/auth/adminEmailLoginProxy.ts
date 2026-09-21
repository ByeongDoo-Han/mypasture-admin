import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, backendUrl, secureCookie } from '../../lib/backend';
import { adminLoginSessionSchema, emailLoginChallengeSchema, emailLoginConfirmSchema, emailLoginRequestSchema, isAdminLoginSameOrigin } from './adminEmailLoginContracts';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } });
}

function validateRequest(request: NextRequest) {
  if (!isAdminLoginSameOrigin(request.headers.get('origin'), request.url, request.headers.get('host'), secureCookie())) {
    return json({ message: '허용되지 않은 요청입니다.' }, 403);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({ message: 'JSON 형식으로 요청해 주세요.' }, 415);
  }
  return null;
}

async function callBackend(path: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(backendUrl(path), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return null;
  }
}

/** 계정 존재 여부를 노출하지 않고 관리자 이메일 코드 발송을 대리합니다. */
export async function requestAdminEmailLogin(request: NextRequest) {
  const rejected = validateRequest(request);
  if (rejected) return rejected;
  const parsed = emailLoginRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: '올바른 이메일 주소를 입력해 주세요.' }, 400);
  const backend = await callBackend('/api/v1/auth/admin-email-login/requests', parsed.data);
  if (backend?.status === 429) return json({ message: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' }, 429);
  if (!backend?.ok) return json({ message: '코드 요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 503);
  const challenge = emailLoginChallengeSchema.safeParse(await backend.json().catch(() => null));
  if (!challenge.success) return json({ message: '로그인 서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.' }, 502);
  return json(challenge.data);
}

/** 코드 확인과 ADMIN 응답 검증 후에만 토큰을 HttpOnly 세션 쿠키에 저장합니다. */
export async function confirmAdminEmailLogin(request: NextRequest) {
  const rejected = validateRequest(request);
  if (rejected) return rejected;
  const parsed = emailLoginConfirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: '이메일로 받은 6자리 코드를 입력해 주세요.' }, 400);
  const backend = await callBackend('/api/v1/auth/admin-email-login/confirm', parsed.data);
  if (backend?.status === 429) return json({ message: '확인 요청이 많습니다. 잠시 후 다시 시도해 주세요.' }, 429);
  if (backend?.status === 401 || backend?.status === 403) {
    return json({ message: '코드를 확인할 수 없습니다. 코드를 다시 확인하거나 새로 요청해 주세요.' }, 401);
  }
  if (!backend?.ok) return json({ message: '로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' }, 503);
  const parsedSession = adminLoginSessionSchema.safeParse(await backend.json().catch(() => null));
  if (!parsedSession.success) return json({ message: '로그인 서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.' }, 502);
  const session = parsedSession.data;
  if (session.user.role !== 'ADMIN') return json({ message: '관리자 로그인을 완료할 수 없습니다.' }, 403);
  const response = json({ user: session.user });
  const common = { httpOnly: true, secure: secureCookie(), sameSite: 'strict' as const, path: '/' };
  const remainingSeconds = Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000);
  if (remainingSeconds <= 0) return json({ message: '로그인 시간이 만료되었습니다. 코드를 새로 요청해 주세요.' }, 401);
  response.cookies.set(ACCESS_COOKIE, session.token, { ...common, maxAge: Math.min(session.expiresIn, remainingSeconds) });
  response.cookies.set(REFRESH_COOKIE, session.refreshToken, { ...common, maxAge: 60 * 60 * 24 * 30 });
  return response;
}
