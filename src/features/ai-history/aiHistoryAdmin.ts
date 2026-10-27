import 'server-only';
import { z } from 'zod/v3';
import { requireAdminSession } from '../../lib/adminSession';
import { backendUrl } from '../../lib/backend';

export const aiHistoryItemSchema = z.object({
  turnId: z.string().uuid(), userId: z.string().uuid(), displayName: z.string(), email: z.string().nullable(),
  questionPreview: z.string(), createdAt: z.string(), revisionCount: z.number().int().nonnegative(),
});
export const aiHistoryPageSchema = z.object({
  items: z.array(aiHistoryItemSchema), page: z.number().int().nonnegative(), size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
});
export const aiHistoryDetailSchema = z.object({
  userId: z.string().uuid(), displayName: z.string(), email: z.string().nullable(), createdAt: z.string(),
  history: z.object({
    rootTurnId: z.string().uuid(), question: z.string(),
    versions: z.array(z.object({
      turnId: z.string().uuid(), kind: z.enum(['ORIGINAL', 'REGENERATED']), createdAt: z.string(), answer: z.string(),
      citations: z.array(z.object({ version: z.string(), book: z.string(), chapter: z.number(), verse: z.number(), text: z.string() })),
      prayer: z.object({ title: z.string(), content: z.string() }).nullable(),
    })),
  }),
});
export type AiHistoryItem = z.infer<typeof aiHistoryItemSchema>;
export type AiHistoryPage = z.infer<typeof aiHistoryPageSchema>;
export type AiHistoryDetail = z.infer<typeof aiHistoryDetailSchema>;

/** 관리자 세션으로 필요한 한 페이지만 조회하고 응답 계약을 검증합니다. */
export async function getAiHistoryPage(page: number): Promise<AiHistoryPage> {
  const { accessToken } = await requireAdminSession();
  const response = await fetch(backendUrl(`/api/v1/admin/ai/history?page=${page}&size=20`), {
    headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!response?.ok) throw new Error('AI 목자 기록을 불러오지 못했습니다.');
  const parsed = aiHistoryPageSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error('AI 목자 기록 응답 형식이 올바르지 않습니다.');
  return parsed.data;
}
