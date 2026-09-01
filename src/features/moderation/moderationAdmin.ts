import 'server-only';
import { z } from 'zod';
import { requireAdminSession } from '../../lib/adminSession';
import { backendUrl } from '../../lib/backend';

export const moderationStatusSchema = z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']);
export const moderationTargetTypeSchema = z.enum(['AI_ANSWER', 'QUIET_TIME_ANSWER']);
export const moderationReportSchema = z.object({
  id: z.string().uuid(), reporterUserId: z.string().uuid(), targetType: moderationTargetTypeSchema,
  targetId: z.string().uuid(), targetUserId: z.string().uuid().nullable(), reason: z.string(),
  details: z.string().nullable(), targetSnapshot: z.string(), status: moderationStatusSchema,
  action: z.enum(['NONE', 'CONTENT_HIDDEN']), resolvedBy: z.string().uuid().nullable(),
  resolutionNote: z.string().nullable(), resolvedAt: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(),
});
export const moderationReportPageSchema = z.object({
  items: z.array(moderationReportSchema), page: z.number().int().nonnegative(), size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
});
export type ModerationReport = z.infer<typeof moderationReportSchema>;
export type ModerationReportPage = z.infer<typeof moderationReportPageSchema>;
export type ModerationStatus = z.infer<typeof moderationStatusSchema>;
export type ModerationTargetType = z.infer<typeof moderationTargetTypeSchema>;

/** 관리자 세션으로 신고 대기열을 조회하고 응답 계약을 검증합니다. */
export async function getModerationReports(input: {
  status?: ModerationStatus;
  targetType?: ModerationTargetType;
  page?: number;
}): Promise<ModerationReportPage> {
  const { accessToken } = await requireAdminSession();
  const query = new URLSearchParams({ page: String(input.page ?? 0), size: '20' });
  if (input.status) query.set('status', input.status);
  if (input.targetType) query.set('targetType', input.targetType);
  const response = await fetch(backendUrl(`/api/v1/admin/moderation/reports?${query}`), {
    headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!response?.ok) throw new Error('신고 대기열을 불러오지 못했습니다.');
  const parsed = moderationReportPageSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error('신고 대기열 응답 형식이 올바르지 않습니다.');
  return parsed.data;
}
