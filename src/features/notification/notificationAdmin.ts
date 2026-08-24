import 'server-only';
import { z } from 'zod';
import { requireAdminSession } from '../../lib/adminSession';
import { backendUrl } from '../../lib/backend';

export const notificationTypeSchema = z.enum(['DAILY_WORD']);
export const notificationOperationsSchema = z.object({
  from: z.string(), to: z.string(), generatedAt: z.string(),
  summary: z.object({
    broadcasts: z.number().int().nonnegative(), deviceDeliveries: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(), processing: z.number().int().nonnegative(),
    retryWait: z.number().int().nonnegative(), sentToProvider: z.number().int().nonnegative(),
    dead: z.number().int().nonnegative(), receivedByApp: z.number().int().nonnegative(),
    openedFromPush: z.number().int().nonnegative(), readInApp: z.number().int().nonnegative(),
    opened: z.number().int().nonnegative(),
  }),
  broadcasts: z.array(z.object({
    id: z.string().uuid(), type: notificationTypeSchema, title: z.string(), body: z.string(),
    destinationType: z.enum(['TODAY_WORD']), publishedAt: z.string(), expiresAt: z.string(),
    deviceDeliveries: z.number().int().nonnegative(), sentToProvider: z.number().int().nonnegative(),
    dead: z.number().int().nonnegative(), receivedByApp: z.number().int().nonnegative(),
    openedFromPush: z.number().int().nonnegative(), readInApp: z.number().int().nonnegative(),
    opened: z.number().int().nonnegative(),
  })),
  page: z.number().int().nonnegative(), size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(), hasNext: z.boolean(),
});

export type NotificationOperations = z.infer<typeof notificationOperationsSchema>;

/** 관리자 JWT를 브라우저에 노출하지 않고 알림 운영 응답을 서버에서 검증합니다. */
export async function getNotificationOperations(): Promise<NotificationOperations> {
  const { accessToken } = await requireAdminSession();
  const response = await fetch(backendUrl('/api/v1/admin/notifications/operations?page=0&size=20'), {
    headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!response?.ok) throw new Error('알림 운영 데이터를 불러오지 못했습니다.');
  const parsed = notificationOperationsSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error('알림 운영 API 응답 형식이 올바르지 않습니다.');
  return parsed.data;
}
