import 'server-only';
import { z } from 'zod';
import { requireAdminSession } from '../../lib/adminSession';
import { backendUrl } from '../../lib/backend';

const sectionSchema = z.object({
  startVerse: z.number().int().positive(), endVerse: z.number().int().positive(),
  title: z.string(), explanation: z.string(),
});

const referenceSchema = z.object({
  bookCode: z.string(), chapter: z.number().int().positive(), verse: z.number().int().positive(), reason: z.string(),
});

const commentaryContentSchema = z.object({
  id: z.string().uuid(), version: z.string(), bookCode: z.string(), bookName: z.string(), chapter: z.number().int().positive(),
  revision: z.number().int().positive(), summary: z.string(), historicalContext: z.string(), sections: z.array(sectionSchema),
  keyThemes: z.array(z.string()), crossReferences: z.array(referenceSchema), reflectionQuestions: z.array(z.string()),
  cautions: z.array(z.string()), publishedAt: z.string().nullable(),
});

export const commentaryAdminSchema = z.object({
  commentary: commentaryContentSchema,
  status: z.enum(['DRAFT', 'PUBLISHED', 'REJECTED', 'SUPERSEDED']), model: z.string(), qualityScore: z.number().nullable(),
  evaluationStatus: z.enum(['NOT_EVALUATED', 'PASSED', 'FAILED', 'MANUAL_REVIEW']), evaluatorModel: z.string().nullable(),
  evaluationScore: z.number().int().min(1).max(5).nullable(), evaluationGroundingScore: z.number().int().min(1).max(5).nullable(),
  evaluationHistoricalEvidenceScore: z.number().int().min(1).max(5).nullable(),
  evaluationReferenceRelevanceScore: z.number().int().min(1).max(5).nullable(),
  evaluationTheologicalNeutralityScore: z.number().int().min(1).max(5).nullable(),
  evaluationClarityScore: z.number().int().min(1).max(5).nullable(), fabricatedScripture: z.boolean(),
  unsupportedHistoricalClaims: z.boolean(), evaluationIssues: z.array(z.string()), evaluationPromptTokens: z.number().int().nonnegative(),
  evaluationCompletionTokens: z.number().int().nonnegative(), evaluationCostUsd: z.number().nonnegative(), reviewNotes: z.string().nullable(),
  promptTokens: z.number().int().nonnegative(), completionTokens: z.number().int().nonnegative(), estimatedCostUsd: z.number().nonnegative(), createdAt: z.string(),
});

export const commentaryJobSchema = z.object({
  id: z.string().uuid(), version: z.string(), bookCode: z.string(), chapter: z.number().int().positive(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']), attemptCount: z.number().int().nonnegative(),
  errorMessage: z.string().nullable(), commentaryId: z.string().uuid().nullable(), createdAt: z.string(), updatedAt: z.string(),
});

export const bibleBookSchema = z.object({
  code: z.string(), name: z.string(), testament: z.enum(['OLD', 'NEW']), displayOrder: z.number().int().positive(), chapterCount: z.number().int().positive(),
});

export type BibleCommentaryAdmin = z.infer<typeof commentaryAdminSchema>;
export type BibleCommentaryJob = z.infer<typeof commentaryJobSchema>;
export type BibleBook = z.infer<typeof bibleBookSchema>;

/** 관리자 JWT로 장별 해설, 생성 작업과 성경 권 목록을 병렬 조회하고 응답 계약을 검증합니다. */
export async function getBibleCommentaryOperations(): Promise<{
  commentaries: BibleCommentaryAdmin[];
  jobs: BibleCommentaryJob[];
  books: BibleBook[];
}> {
  const { accessToken } = await requireAdminSession();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [commentariesResponse, jobsResponse, booksResponse] = await Promise.all([
    fetch(backendUrl('/api/v1/admin/bible-commentaries'), { headers, cache: 'no-store', signal: AbortSignal.timeout(7_000) }),
    fetch(backendUrl('/api/v1/admin/bible-commentaries/generation-jobs'), { headers, cache: 'no-store', signal: AbortSignal.timeout(7_000) }),
    fetch(backendUrl('/api/v1/bibles/KOR1910/books'), { headers, cache: 'no-store', signal: AbortSignal.timeout(7_000) }),
  ]).catch(() => [null, null, null] as const);
  if (!commentariesResponse?.ok || !jobsResponse?.ok || !booksResponse?.ok) throw new Error('장별 해설 운영 데이터를 불러오지 못했습니다.');
  const commentaries = z.array(commentaryAdminSchema).safeParse(await commentariesResponse.json().catch(() => null));
  const jobs = z.array(commentaryJobSchema).safeParse(await jobsResponse.json().catch(() => null));
  const books = z.array(bibleBookSchema).safeParse(await booksResponse.json().catch(() => null));
  if (!commentaries.success || !jobs.success || !books.success) throw new Error('장별 해설 API 응답 형식이 올바르지 않습니다.');
  return { commentaries: commentaries.data, jobs: jobs.data, books: books.data };
}
