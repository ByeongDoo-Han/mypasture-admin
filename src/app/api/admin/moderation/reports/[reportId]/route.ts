import { NextRequest } from 'next/server';
import { proxyModerationReview } from '../../../../../../features/moderation/moderationAdminProxy';

/** 관리자 신고 처리 요청을 동일 출처 BFF를 통해 백엔드로 전달합니다. */
export async function PATCH(request: NextRequest, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;
  return proxyModerationReview(request, reportId);
}
