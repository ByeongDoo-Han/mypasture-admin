import type { NextRequest } from 'next/server';
import { proxyAiHistoryReview } from '../../../../../../../features/ai-history/aiHistoryAdminProxy';

/** 관리자 AI 원문 열람의 사유와 세션을 서버에서 검증합니다. */
export async function POST(request: NextRequest, context: { params: Promise<{ turnId: string }> }) {
  return proxyAiHistoryReview(request, (await context.params).turnId);
}
