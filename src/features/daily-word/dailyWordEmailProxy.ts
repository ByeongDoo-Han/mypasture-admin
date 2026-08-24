import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_COOKIE, backendUrl } from '../../lib/backend';
import { incidentEmailDeliverySchema, incidentEmailOperationsSchema } from './dailyWordAdmin';

const statusSchema = z.enum(['PENDING', 'PROCESSING', 'RETRY_WAIT', 'SENT', 'DEAD']);
const requeueSchema = z.object({ operationId: z.string().uuid(), reason: z.string().trim().min(5).max(500) });

/** 필터를 제한하고 HttpOnly 관리자 JWT로 이메일 outbox 조회를 대리합니다. */
export async function proxyIncidentEmailDeliveries(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const source = request.nextUrl.searchParams;
  const parsed = z.object({
    status: statusSchema.optional(), incidentId: z.string().uuid().optional(),
    from: z.string().datetime().optional(), to: z.string().datetime().optional(),
    page: z.coerce.number().int().min(0).default(0), size: z.coerce.number().int().min(1).max(100).default(20),
  }).safeParse({
    status: source.get('status') || undefined, incidentId: source.get('incidentId') || undefined,
    from: source.get('from') || undefined, to: source.get('to') || undefined,
    page: source.get('page') ?? 0, size: source.get('size') ?? 20,
  });
  if (!parsed.success) return NextResponse.json({ message: '이메일 발송 조회 조건이 올바르지 않습니다.' }, { status: 400 });
  const query = new URLSearchParams();
  Object.entries(parsed.data).forEach(([key, value]) => { if (value !== undefined) query.set(key, String(value)); });
  const backend = await fetch(backendUrl(`/api/v1/admin/daily-words/incident-email-deliveries?${query}`), {
    headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!backend) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503 });
  const body = await backend.json().catch(() => null);
  if (!backend.ok) return NextResponse.json(body ?? { message: '이메일 발송 현황을 불러오지 못했습니다.' }, { status: backend.status });
  const validated = incidentEmailOperationsSchema.safeParse(body);
  if (!validated.success) return NextResponse.json({ message: '이메일 발송 API 응답 형식이 올바르지 않습니다.' }, { status: 502 });
  return NextResponse.json(validated.data);
}

/** same-origin과 사유를 검증하고 실패 이메일 단건 재처리를 대리합니다. */
export async function proxyIncidentEmailRequeue(request: NextRequest, deliveryId: string): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  if (origin && safeHost(origin) !== request.nextUrl.host) return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403 });
  if (!z.string().uuid().safeParse(deliveryId).success) return NextResponse.json({ message: '발송 작업 ID가 올바르지 않습니다.' }, { status: 400 });
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const parsed = requeueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: '재처리 사유를 5자 이상 입력해 주세요.' }, { status: 400 });
  const backend = await fetch(backendUrl(`/api/v1/admin/daily-words/incident-email-deliveries/${deliveryId}/requeue`), {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data), cache: 'no-store', signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!backend) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503 });
  const body = await backend.json().catch(() => null);
  if (!backend.ok) return NextResponse.json(body ?? { message: '이메일 재처리를 요청하지 못했습니다.' }, { status: backend.status });
  const validated = incidentEmailDeliverySchema.safeParse(body);
  if (!validated.success) return NextResponse.json({ message: '이메일 재처리 API 응답 형식이 올바르지 않습니다.' }, { status: 502 });
  return NextResponse.json(validated.data);
}

function safeHost(origin: string): string | null { try { return new URL(origin).host; } catch { return null; } }
