import type { NextRequest } from 'next/server';
import { proxyIncidentEmailDeliveries } from '../../../../../features/daily-word/dailyWordEmailProxy';

/** 오늘의 말씀 incident 이메일 outbox 조회를 백엔드로 전달합니다. */
export async function GET(request: NextRequest) {
  return proxyIncidentEmailDeliveries(request);
}
