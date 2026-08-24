import type { NextRequest } from 'next/server';
import { proxyIncidentEmailRequeue } from '../../../../../../../features/daily-word/dailyWordEmailProxy';

/** 실패한 incident 이메일 단건 재처리를 백엔드로 전달합니다. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return proxyIncidentEmailRequeue(request, (await context.params).id);
}
