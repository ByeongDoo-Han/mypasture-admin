import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE } from './src/lib/backend';

/** 보호 화면에 인증 쿠키가 전혀 없는 요청을 로그인 페이지로 빠르게 돌려보냅니다. */
export function middleware(request: NextRequest) {
  if (!request.cookies.has(ACCESS_COOKIE)) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/'] };
