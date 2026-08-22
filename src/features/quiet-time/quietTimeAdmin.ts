import 'server-only';
import { z } from 'zod';
import { backendUrl } from '../../lib/backend';
import { requireAdminSession } from '../../lib/adminSession';

const scopeSchema = z.enum(['PASTURE', 'STANDALONE']);
const statusSchema = z.enum(['DRAFT', 'OPEN', 'CLOSED']);
const qrStatusSchema = z.enum(['SCHEDULED', 'OPEN', 'EXPIRED', 'REVOKED', 'CLOSED']);

const summarySchema = z.object({
  id: z.string().uuid(), scope: scopeSchema, status: statusSchema, title: z.string(),
  pastureName: z.string().nullable(), managerDisplayName: z.string(), passageReference: z.string(),
  meetingDate: z.string(), meetingStartsAt: z.string(), meetingEndsAt: z.string(),
  participantCount: z.number(), answerCount: z.number(), createdAt: z.string(),
});

const pageSchema = z.object({
  content: z.array(summarySchema), page: z.number(), size: z.number(),
  totalElements: z.number(), totalPages: z.number(),
});

const statisticsSchema = z.object({
  fromDate: z.string(), toDate: z.string(), totalSessions: z.number(), openSessions: z.number(),
  closedSessions: z.number(), pastureSessions: z.number(), standaloneSessions: z.number(),
  participants: z.number(), answers: z.number(),
});

const detailSchema = z.object({
  summary: summarySchema,
  passageTitle: z.string(),
  qrStatus: qrStatusSchema.nullable(),
  qrExpiresAt: z.string().nullable(),
  recentActions: z.array(z.object({
    id: z.string().uuid(), adminUserId: z.string().uuid(),
    action: z.enum(['QUIET_TIME_FORCE_CLOSED', 'QUIET_TIME_QR_REVOKED']),
    reason: z.string(), details: z.string(), createdAt: z.string(),
  })),
});

export type QuietTimeScope = z.infer<typeof scopeSchema>;
export type QuietTimeStatus = z.infer<typeof statusSchema>;
export type QuietTimeSessionSummary = z.infer<typeof summarySchema>;
export type QuietTimeSessionPage = z.infer<typeof pageSchema>;
export type QuietTimeStatistics = z.infer<typeof statisticsSchema>;
export type QuietTimeSessionDetail = z.infer<typeof detailSchema>;

export class AdminBackendError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

/** 민감한 관리자 JWT를 서버에 유지한 채 QT 운영 API를 호출하고 응답 계약을 검증합니다. */
async function fetchAdminJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const { accessToken } = await requireAdminSession();
  const response = await fetch(backendUrl(path), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!response) throw new AdminBackendError(503, '백엔드에 연결할 수 없습니다.');
  if (!response.ok) throw new AdminBackendError(response.status, '운영 데이터를 불러오지 못했습니다.');
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new AdminBackendError(502, '백엔드 응답 형식이 올바르지 않습니다.');
  return parsed.data;
}

export function getQuietTimeStatistics(): Promise<QuietTimeStatistics> {
  return fetchAdminJson('/api/v1/admin/quiet-time/statistics', statisticsSchema);
}

export function getQuietTimeSessions(filters: {
  scope?: string; status?: string; search?: string; page?: string;
}): Promise<QuietTimeSessionPage> {
  const query = new URLSearchParams({ page: filters.page ?? '0', size: '20' });
  if (scopeSchema.safeParse(filters.scope).success) query.set('scope', filters.scope!);
  if (statusSchema.safeParse(filters.status).success) query.set('status', filters.status!);
  if (filters.search?.trim()) query.set('search', filters.search.trim().slice(0, 100));
  return fetchAdminJson(`/api/v1/admin/quiet-time/sessions?${query}`, pageSchema);
}

export function getQuietTimeSession(sessionId: string): Promise<QuietTimeSessionDetail> {
  if (!z.string().uuid().safeParse(sessionId).success) throw new AdminBackendError(400, '세션 ID가 올바르지 않습니다.');
  return fetchAdminJson(`/api/v1/admin/quiet-time/sessions/${sessionId}`, detailSchema);
}
