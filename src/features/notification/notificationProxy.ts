import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_COOKIE, backendUrl } from '../../lib/backend';
import { notificationOperationsSchema, notificationTypeSchema } from './notificationAdmin';

/** 조회 범위를 제한하고 HttpOnly 관리자 JWT로 알림 운영 API를 대리합니다. */
export async function proxyNotificationOperations(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const source = request.nextUrl.searchParams;
  const parsed = z.object({
    type: notificationTypeSchema.optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional(),
    page: z.coerce.number().int().min(0).default(0), size: z.coerce.number().int().min(1).max(100).default(20),
  }).safeParse({
    type: source.get('type') || undefined, from: source.get('from') || undefined, to: source.get('to') || undefined,
    page: source.get('page') ?? 0, size: source.get('size') ?? 20,
  });
  if (!parsed.success) return NextResponse.json({ message: '알림 운영 조회 조건이 올바르지 않습니다.' }, { status: 400 });
  const query = new URLSearchParams();
  Object.entries(parsed.data).forEach(([key, value]) => { if (value !== undefined) query.set(key, String(value)); });
  const backend = await fetch(backendUrl(`/api/v1/admin/notifications/operations?${query}`), {
    headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!backend) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503 });
  const body = await backend.json().catch(() => null);
  if (!backend.ok) return NextResponse.json(body ?? { message: '알림 운영 현황을 불러오지 못했습니다.' }, { status: backend.status });
  const validated = notificationOperationsSchema.safeParse(body);
  if (!validated.success) return NextResponse.json({ message: '알림 운영 API 응답 형식이 올바르지 않습니다.' }, { status: 502 });
  return NextResponse.json(validated.data);
}
