import type { NextRequest } from 'next/server';
import { proxyBibleSearch } from '../../../../../features/daily-word/bibleSearchProxy';

/** 관리자 전용 성경 검색 프록시입니다. */
export async function GET(request: NextRequest) {
  return proxyBibleSearch(request);
}
