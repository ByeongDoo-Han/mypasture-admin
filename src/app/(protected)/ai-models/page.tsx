import { BrainCircuit } from 'lucide-react';
import { AiModelOperations } from '../../../features/ai-models/AiModelOperations';
import { getAiRuntimeOverview } from '../../../features/ai-models/aiModelAdmin';

/** AI 목자의 생성·평가 모델을 버전 단위로 운영하는 관리자 화면입니다. */
export default async function AiModelsPage() {
  const overview = await getAiRuntimeOverview().catch(() => null);
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800"><BrainCircuit size={20} /></span>
        <div><p className="text-sm font-medium text-emerald-700">AI 운영</p><h1 className="mt-1 text-2xl font-bold text-slate-950">모델 설정</h1><p className="mt-2 text-sm text-slate-600">생성 답변은 평가를 통과한 뒤에만 사용자에게 전달됩니다.</p></div>
      </header>
      {overview ? <AiModelOperations overview={overview} /> : <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">AI 설정을 불러오지 못했습니다. 백엔드 연결과 관리자 권한을 확인해 주세요.</div>}
    </div>
  );
}
