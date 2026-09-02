import { NextResponse } from 'next/server';

/** Cloud Run이 관리자 프로세스의 HTTP 응답 가능 여부만 확인하는 공개 상태 엔드포인트입니다. */
export function GET() {
  return NextResponse.json(
    { status: 'UP' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
