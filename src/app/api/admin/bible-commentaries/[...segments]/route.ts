import { NextRequest } from 'next/server';
import { proxyBibleCommentary } from '../../../../../features/bible-commentary/bibleCommentaryAdminProxy';

type Context = { params: Promise<{ segments: string[] }> };

/** 검증된 장별 해설 관리자 요청만 백엔드로 전달합니다. */
export async function GET(request: NextRequest, context: Context) {
  return proxyBibleCommentary(request, (await context.params).segments);
}

export async function POST(request: NextRequest, context: Context) {
  return proxyBibleCommentary(request, (await context.params).segments);
}

export async function PUT(request: NextRequest, context: Context) {
  return proxyBibleCommentary(request, (await context.params).segments);
}
