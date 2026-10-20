import { requireAdminSession } from '../../lib/adminSession';
import { backendUrl } from '../../lib/backend';

/** 서버에서 관리자 세션을 검증하고 Swagger 명세만 가져옵니다. */
export async function getAdminApiSpecification(): Promise<Record<string, unknown>> {
  const { accessToken } = await requireAdminSession();
  const response = await fetch(backendUrl('/v3/api-docs'), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('API 문서를 불러올 수 없습니다.');
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !('openapi' in body) || typeof body.openapi !== 'string' ||
      !('paths' in body) || typeof body.paths !== 'object' || !body.paths) {
    throw new Error('API 문서 형식을 확인할 수 없습니다.');
  }
  return body as Record<string, unknown>;
}
