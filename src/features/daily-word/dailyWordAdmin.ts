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
  id: z.string().uuid(), date: z.string(), status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  attemptCount: z.number(), errorMessage: z.string().nullable(), dailyWordId: z.string().uuid().nullable(),
  createdAt: z.string(), updatedAt: z.string(),
});

export const dailyWordIncidentSchema = z.object({
  id: z.string().uuid(), date: z.string(),
  type: z.enum(['PUBLISHING_MISSING', 'GENERATION_FAILED', 'GENERATION_STALLED']),
  severity: z.enum(['WARNING', 'CRITICAL']), status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']),
  message: z.string(), latestJobId: z.string().uuid().nullable(), occurrenceCount: z.number().int().positive(),
  firstDetectedAt: z.string(), lastDetectedAt: z.string(), acknowledgedBy: z.string().uuid().nullable(),
  acknowledgedAt: z.string().nullable(), resolvedBy: z.string().uuid().nullable(), resolvedAt: z.string().nullable(),
  resolutionNote: z.string().nullable(),
});

export const incidentEmailDeliverySchema = z.object({
  id: z.string().uuid(), incidentId: z.string().uuid(), incidentDate: z.string(),
  incidentType: z.enum(['PUBLISHING_MISSING', 'GENERATION_FAILED', 'GENERATION_STALLED']),
  incidentSeverity: z.enum(['WARNING', 'CRITICAL']), notificationVersion: z.number().int().positive(),
  maskedRecipient: z.string(), status: z.enum(['PENDING', 'PROCESSING', 'RETRY_WAIT', 'SENT', 'DEAD']),
  attemptCount: z.number().int().nonnegative(), nextAttemptAt: z.string(), errorSummary: z.string().nullable(),
  sentAt: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(), requeueAllowed: z.boolean(),
});

export const incidentEmailOperationsSchema = z.object({
  from: z.string(), to: z.string(), generatedAt: z.string(),
  summary: z.object({
    pending: z.number().int().nonnegative(), processing: z.number().int().nonnegative(),
    retryWait: z.number().int().nonnegative(), sent: z.number().int().nonnegative(), dead: z.number().int().nonnegative(),
  }),
  deliveries: z.array(incidentEmailDeliverySchema), page: z.number().int().nonnegative(),
  size: z.number().int().positive(), totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(), hasNext: z.boolean(),
});

const readinessSchema = z.object({
  date: z.string(), status: z.enum(['MISSING', 'DRAFT', 'PUBLISHED', 'REJECTED']), publishedAt: z.string().nullable(),
});

export const operationsSummarySchema = z.object({
  from: z.string(), to: z.string(), generatedAt: z.string(),
  today: readinessSchema, tomorrow: readinessSchema,
  content: z.object({
    draft: z.number().int().nonnegative(), published: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(), missing: z.number().int().nonnegative(),
    datesNeedingAttention: z.array(z.string()),
  }),
  jobs: z.object({
    pending: z.number().int().nonnegative(), processing: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(), failed: z.number().int().nonnegative(), cancelled: z.number().int().nonnegative(),
    oldestActiveCreatedAt: z.string().nullable(),
  }),
  usage: z.object({
    embeddingTokens: z.number().int().nonnegative(), promptTokens: z.number().int().nonnegative(),
    completionTokens: z.number().int().nonnegative(), estimatedCostUsd: z.number().nonnegative(),
  }),
});

export type DailyWordAdmin = z.infer<typeof dailyWordSchema>;
export type DailyWordGenerationJob = z.infer<typeof generationJobSchema>;
export type DailyWordIncident = z.infer<typeof dailyWordIncidentSchema>;
export type DailyWordOperationsSummary = z.infer<typeof operationsSummarySchema>;
export type IncidentEmailDelivery = z.infer<typeof incidentEmailDeliverySchema>;
export type IncidentEmailOperations = z.infer<typeof incidentEmailOperationsSchema>;

/** 관리자 JWT로 오늘의 말씀 검수 목록과 최근 생성 작업을 서버에서 조회하고 검증합니다. */
export async function getDailyWordOperations(): Promise<{
  words: DailyWordAdmin[];
  jobs: DailyWordGenerationJob[];
  incidents: DailyWordIncident[];
  emailOperations: IncidentEmailOperations;
  summary: DailyWordOperationsSummary;
}> {
  const { accessToken } = await requireAdminSession();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [wordsResponse, jobsResponse, summaryResponse, incidentsResponse, emailOperationsResponse] = await Promise.all([
    fetch(backendUrl('/api/v1/admin/daily-words'), { headers, cache: 'no-store', signal: AbortSignal.timeout(7_000) }),
    fetch(backendUrl('/api/v1/admin/daily-words/generation-jobs'), { headers, cache: 'no-store', signal: AbortSignal.timeout(7_000) }),
    fetch(backendUrl('/api/v1/admin/daily-words/operations-summary'), { headers, cache: 'no-store', signal: AbortSignal.timeout(7_000) }),
    fetch(backendUrl('/api/v1/admin/daily-words/incidents'), { headers, cache: 'no-store', signal: AbortSignal.timeout(7_000) }),
    fetch(backendUrl('/api/v1/admin/daily-words/incident-email-deliveries?page=0&size=20'), { headers, cache: 'no-store', signal: AbortSignal.timeout(7_000) }),
  ]).catch(() => [null, null, null, null, null] as const);
  if (!wordsResponse?.ok || !jobsResponse?.ok || !summaryResponse?.ok || !incidentsResponse?.ok || !emailOperationsResponse?.ok) throw new Error('오늘의 말씀 운영 데이터를 불러오지 못했습니다.');
  const words = z.array(dailyWordSchema).safeParse(await wordsResponse.json().catch(() => null));
  const jobs = z.array(generationJobSchema).safeParse(await jobsResponse.json().catch(() => null));
  const summary = operationsSummarySchema.safeParse(await summaryResponse.json().catch(() => null));
  const incidents = z.array(dailyWordIncidentSchema).safeParse(await incidentsResponse.json().catch(() => null));
  const emailOperations = incidentEmailOperationsSchema.safeParse(await emailOperationsResponse.json().catch(() => null));
  if (!words.success || !jobs.success || !summary.success || !incidents.success || !emailOperations.success) throw new Error('오늘의 말씀 API 응답 형식이 올바르지 않습니다.');
  return { words: words.data, jobs: jobs.data, summary: summary.data, incidents: incidents.data, emailOperations: emailOperations.data };
}
