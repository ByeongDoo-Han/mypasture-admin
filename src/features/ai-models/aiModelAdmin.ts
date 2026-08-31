import 'server-only';
import { z } from 'zod';
import { backendUrl } from '../../lib/backend';
import { requireAdminSession } from '../../lib/adminSession';

export const modelRoleSchema = z.enum(['GENERATOR', 'EVALUATOR']);
export const reasoningSchema = z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'XHIGH', 'MAX']);
export const aiUseCaseSchema = z.enum(['AI_PASTOR', 'DAILY_WORD', 'BIBLE_COMMENTARY']);

export const runtimeConfigSchema = z.object({
  id: z.string().uuid().nullable(), useCase: aiUseCaseSchema, version: z.number(),
  generatorModel: z.string(), evaluatorModel: z.string(),
  generatorReasoningEffort: reasoningSchema, evaluatorReasoningEffort: reasoningSchema,
  maxOutputTokens: z.number(), evaluationMaxOutputTokens: z.number(),
  evaluationEnabled: z.boolean(), evaluationThreshold: z.number(), maxRevisionCount: z.number(),
  source: z.string(),
});

export const modelDefinitionSchema = z.object({
  modelId: z.string(), displayName: z.string(), roles: z.array(modelRoleSchema),
  inputCostPerMillionUsd: z.number(), outputCostPerMillionUsd: z.number(),
  streamingSupported: z.boolean(), structuredOutputSupported: z.boolean(),
});

export const runtimeVersionSchema = z.object({
  config: runtimeConfigSchema, active: z.boolean(), previousVersionId: z.string().uuid().nullable(),
  createdBy: z.string().uuid().nullable(), reason: z.string(), createdAt: z.string(),
});

export const runtimeOverviewSchema = z.object({
  current: runtimeConfigSchema,
  models: z.array(modelDefinitionSchema),
  history: z.array(runtimeVersionSchema),
});

export type AiRuntimeOverview = z.infer<typeof runtimeOverviewSchema>;
export type AiRuntimeConfig = z.infer<typeof runtimeConfigSchema>;
export type AiModelDefinition = z.infer<typeof modelDefinitionSchema>;
export type AiUseCase = z.infer<typeof aiUseCaseSchema>;

/** 관리자 JWT를 서버에 유지하며 AI 런타임 설정 응답을 Zod 계약으로 검증합니다. */
export async function getAiRuntimeOverview(useCase: AiUseCase): Promise<AiRuntimeOverview> {
  const { accessToken } = await requireAdminSession();
  const response = await fetch(backendUrl(`/api/v1/admin/ai/runtime-config?useCase=${encodeURIComponent(useCase)}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(7_000),
  }).catch(() => null);
  if (!response?.ok) throw new Error('AI 런타임 설정을 불러오지 못했습니다.');
  const parsed = runtimeOverviewSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error('AI 런타임 설정 응답 형식이 올바르지 않습니다.');
  return parsed.data;
}
