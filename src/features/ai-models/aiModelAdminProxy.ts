import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_COOKIE, backendUrl } from '../../lib/backend';
import { aiUseCaseSchema, reasoningSchema } from './aiModelAdmin';

const activationSchema = z.object({
  operationId: z.string().uuid(), useCase: aiUseCaseSchema,
  generatorModel: z.string().min(1).max(80), evaluatorModel: z.string().min(1).max(80),
  generatorReasoningEffort: reasoningSchema, evaluatorReasoningEffort: reasoningSchema,
  maxOutputTokens: z.number().int().min(100).max(2000),
  evaluationMaxOutputTokens: z.number().int().min(100).max(500),
  evaluationEnabled: z.boolean(), evaluationThreshold: z.number().int().min(1).max(5),
  maxRevisionCount: z.number().int().min(0).max(1), reason: z.string().trim().min(5).max(500),
});
const rollbackSchema = z.object({
  operationId: z.string().uuid(), targetVersionId: z.string().uuid(), reason: z.string().trim().min(5).max(500),
});

/** 동일 출처와 입력을 검증하고 HttpOnly 관리자 JWT로 AI 설정 변경을 대리 호출합니다. */
export async function proxyAiModelAction(request: NextRequest, action: 'activate' | 'rollback'): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  if (origin && safeHost(origin) !== request.nextUrl.host) {
    return NextResponse.json({ message: '허용되지 않은 요청입니다.' }, { status: 403 });
  }
  const schema = action === 'activate' ? activationSchema : rollbackSchema;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'AI 모델 설정 입력값을 확인해 주세요.' }, { status: 400 });
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const backend = await fetch(backendUrl(`/api/v1/admin/ai/runtime-config/${action}`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!backend) return NextResponse.json({ message: '백엔드에 연결할 수 없습니다.' }, { status: 503 });
  const body = await backend.json().catch(() => ({ message: 'AI 설정을 변경하지 못했습니다.' }));
  return NextResponse.json(body, { status: backend.status });
}

function safeHost(origin: string): string | null {
  try { return new URL(origin).host; } catch { return null; }
}
