import { NextRequest } from 'next/server';
import { proxyAiModelAction } from '../../../../../../features/ai-models/aiModelAdminProxy';

export async function POST(request: NextRequest) {
  return proxyAiModelAction(request, 'rollback');
}
