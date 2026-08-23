import 'server-only';
import { z } from 'zod';
import { requireAdminSession } from '../../lib/adminSession';
import { backendUrl } from '../../lib/backend';

const statusSchema = z.enum(['DRAFT', 'PUBLISHED', 'REJECTED']);
const sourceSchema = z.enum(['AI', 'MANUAL', 'CURATED']);

export const dailyWordSchema = z.object({
  id: z.string().uuid(), date: z.string(), verseId: z.number().nullable(), version: z.string(),
  bookCode: z.string(), bookName: z.string(), chapter: z.number(), verse: z.number(), verseText: z.string(),
  meditation: z.string(), actionQuestion: z.string(), status: statusSchema, source: sourceSchema,
  contentRevision: z.number(), model: z.string().nullable(), promptVersion: z.string().nullable(),
  retrievalStrategy: z.string().nullable(), embeddingTokens: z.number(), promptTokens: z.number(),
  completionTokens: z.number(), estimatedCostUsd: z.number(), reviewedBy: z.string().uuid().nullable(),
  rejectionReason: z.string().nullable(), generatedAt: z.string().nullable(), reviewedAt: z.string().nullable(),
  publishedAt: z.string().nullable(), updatedAt: z.string(),
});

export const generationJobSchema = z.object({
  id: z.string().uuid(), date: z.string(), status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  attemptCount: z.number(), errorMessage: z.string().nullable(), dailyWordId: z.string().uuid().nullable(),
  createdAt: z.string(), updatedAt: z.string(),
});

export type DailyWordAdmin = z.infer<typeof dailyWordSchema>;
export type DailyWordGenerationJob = z.infer<typeof generationJobSchema>;

/** 관리자 JWT로 오늘의 말씀 검수 목록과 최근 생성 작업을 서버에서 조회하고 검증합니다. */
export async function getDailyWordOperations(): Promise<{ words: DailyWordAdmin[]; jobs: DailyWordGenerationJob[] }> {
  const { accessToken } = await requireAdminSession();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [wordsResponse, jobsResponse] = await Promise.all([
    fetch(backendUrl('/api/v1/admin/daily-words'), { headers, cache: 'no-store', signal: AbortSignal.timeout(7_000) }),
    fetch(backendUrl('/api/v1/admin/daily-words/generation-jobs'), { headers, cache: 'no-store', signal: AbortSignal.timeout(7_000) }),
  ]).catch(() => [null, null] as const);
  if (!wordsResponse?.ok || !jobsResponse?.ok) throw new Error('오늘의 말씀 운영 데이터를 불러오지 못했습니다.');
  const words = z.array(dailyWordSchema).safeParse(await wordsResponse.json().catch(() => null));
  const jobs = z.array(generationJobSchema).safeParse(await jobsResponse.json().catch(() => null));
  if (!words.success || !jobs.success) throw new Error('오늘의 말씀 API 응답 형식이 올바르지 않습니다.');
  return { words: words.data, jobs: jobs.data };
}
