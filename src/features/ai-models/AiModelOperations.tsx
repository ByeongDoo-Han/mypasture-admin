'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import type { AiRuntimeOverview } from './aiModelAdmin';

type PendingAction = 'activate' | string | null;

/** 활성 모델 설정과 버전 롤백을 멱등 관리자 요청으로 처리하는 운영 화면입니다. */
export function AiModelOperations({ overview }: { overview: AiRuntimeOverview }) {
  const router = useRouter();
  const current = overview.current;
  const [evaluationEnabled, setEvaluationEnabled] = useState(current.evaluationEnabled);
  const [reason, setReason] = useState('');
  const [rollbackReason, setRollbackReason] = useState('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [retryOperation, setRetryOperation] = useState<{ action: string; id: string; fingerprint: string } | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const generatorModels = overview.models.filter((model) => model.roles.includes('GENERATOR'));
  const evaluatorModels = overview.models.filter((model) => model.roles.includes('EVALUATOR'));
  const currentGeneratorSupported = generatorModels.some((model) => model.modelId === current.generatorModel);
  const currentEvaluatorSupported = evaluatorModels.some((model) => model.modelId === current.evaluatorModel);

  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (reason.trim().length < 5) return setMessage({ kind: 'error', text: '변경 사유를 5자 이상 입력해 주세요.' });
    if (!window.confirm('이 설정을 새 활성 버전으로 적용하시겠습니까?')) return;
    const request = {
      useCase: 'AI_PASTOR',
      generatorModel: String(form.get('generatorModel')),
      evaluatorModel: String(form.get('evaluatorModel')),
      generatorReasoningEffort: String(form.get('generatorReasoningEffort')),
      evaluatorReasoningEffort: String(form.get('evaluatorReasoningEffort')),
      maxOutputTokens: Number(form.get('maxOutputTokens')),
      evaluationMaxOutputTokens: Number(form.get('evaluationMaxOutputTokens')),
      evaluationEnabled,
      evaluationThreshold: Number(form.get('evaluationThreshold')),
      maxRevisionCount: Number(form.get('maxRevisionCount')),
      reason: reason.trim(),
    };
    const operationId = operationIdFor('activate', JSON.stringify(request));
    await send('activate', operationId, { operationId, ...request }, '새 AI 모델 설정을 활성화했습니다.');
  }

  async function rollback(targetVersionId: string, version: number) {
    if (rollbackReason.trim().length < 5) return setMessage({ kind: 'error', text: '롤백 사유를 5자 이상 입력해 주세요.' });
    if (!window.confirm(`버전 ${version} 설정을 새 버전으로 복원하시겠습니까?`)) return;
    const action = `rollback:${targetVersionId}`;
    const request = { targetVersionId, reason: rollbackReason.trim() };
    const operationId = operationIdFor(action, JSON.stringify(request));
    await send('rollback', operationId, { operationId, ...request }, `버전 ${version} 설정을 복원했습니다.`, action);
  }

  function operationIdFor(action: string, fingerprint: string): string {
    const id = retryOperation?.action === action && retryOperation.fingerprint === fingerprint
      ? retryOperation.id : crypto.randomUUID();
    setRetryOperation({ action, id, fingerprint });
    return id;
  }

  async function send(
    endpoint: 'activate' | 'rollback', operationId: string, body: Record<string, unknown>, success: string,
    action: string = endpoint,
  ) {
    setPending(action); setMessage(null);
    const response = await fetch(`/api/admin/ai/runtime-config/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).catch(() => null);
    setPending(null);
    if (!response?.ok) {
      const payload = await response?.json().catch(() => null) as { message?: string } | null;
      setMessage({ kind: 'error', text: payload?.message ?? 'AI 모델 설정을 변경하지 못했습니다.' });
      return;
    }
    setRetryOperation((value) => value?.id === operationId ? null : value);
    setReason(''); setRollbackReason('');
    setMessage({ kind: 'success', text: success });
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <form onSubmit={activate} className="border-y border-slate-200 bg-white px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-semibold text-slate-950">활성 설정</h2><p className="mt-1 text-sm text-slate-500">버전 {current.version} · {current.source === 'ENVIRONMENT' ? '환경 변수 기본값' : 'DB 활성 버전'}</p></div>
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">AI 목자</span>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <SelectField label="생성 모델" name="generatorModel" defaultValue={current.generatorModel}>
            {!currentGeneratorSupported ? <option value={current.generatorModel} disabled>{current.generatorModel} · 지원 종료</option> : null}
            {generatorModels.map((model) => <option key={model.modelId} value={model.modelId}>{model.displayName}</option>)}
          </SelectField>
          <SelectField label="평가 모델" name="evaluatorModel" defaultValue={current.evaluatorModel}>
            {!currentEvaluatorSupported ? <option value={current.evaluatorModel} disabled>{current.evaluatorModel} · 지원 종료</option> : null}
            {evaluatorModels.map((model) => <option key={model.modelId} value={model.modelId}>{model.displayName}</option>)}
          </SelectField>
          <SelectField label="생성 추론 강도" name="generatorReasoningEffort" defaultValue={current.generatorReasoningEffort}><ReasoningOptions /></SelectField>
          <SelectField label="평가 추론 강도" name="evaluatorReasoningEffort" defaultValue={current.evaluatorReasoningEffort}><ReasoningOptions /></SelectField>
          <NumberField label="생성 최대 토큰" name="maxOutputTokens" defaultValue={current.maxOutputTokens} min={100} max={2000} />
          <NumberField label="평가 최대 토큰" name="evaluationMaxOutputTokens" defaultValue={current.evaluationMaxOutputTokens} min={100} max={500} />
          <NumberField label="통과 기준 점수" name="evaluationThreshold" defaultValue={current.evaluationThreshold} min={1} max={5} />
          <SelectField label="최대 수정 횟수" name="maxRevisionCount" defaultValue={String(current.maxRevisionCount)}><option value="0">수정 안 함</option><option value="1">최대 1회</option></SelectField>
        </div>
        {!currentGeneratorSupported || !currentEvaluatorSupported ? <p role="alert" className="mt-4 border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">현재 설정에 허용 목록 밖의 모델이 있습니다. 지원되는 모델을 선택해야 새 버전을 활성화할 수 있습니다.</p> : null}
        <label className="mt-5 flex min-h-11 items-center gap-3 border-y border-slate-100 py-3 text-sm font-medium text-slate-800">
          <input type="checkbox" checked={evaluationEnabled} onChange={(event) => setEvaluationEnabled(event.target.checked)} className="h-4 w-4 accent-emerald-700" />
          생성 답변을 평가한 뒤 최종 답변만 전송
        </label>
        <label className="mt-5 block text-sm font-medium text-slate-700">변경 사유
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="운영 지표와 검증 결과를 포함한 변경 사유" />
        </label>
        <div className="mt-4 flex justify-end"><button disabled={pending !== null} type="submit" className="flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{pending === 'activate' ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}새 버전 활성화</button></div>
      </form>

      <section>
        <div className="flex items-center gap-2"><History size={18} className="text-slate-500" /><h2 className="text-base font-semibold text-slate-950">모델 가격과 역할</h2></div>
        <div className="mt-3 overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><Th>모델</Th><Th>역할</Th><Th right>입력 / 100만 토큰</Th><Th right>출력 / 100만 토큰</Th></tr></thead><tbody className="divide-y divide-slate-100">{overview.models.map((model) => <tr key={model.modelId}><Td><strong>{model.displayName}</strong><p className="mt-1 text-xs text-slate-500">{model.modelId}</p></Td><Td>{model.roles.map(roleLabel).join(', ')}</Td><Td right>${model.inputCostPerMillionUsd.toFixed(2)}</Td><Td right>${model.outputCostPerMillionUsd.toFixed(2)}</Td></tr>)}</tbody></table></div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-950">변경 이력</h2>
        <label className="mt-3 block text-sm font-medium text-slate-700">롤백 사유<input value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} maxLength={500} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="복원이 필요한 이유" /></label>
        <div className="mt-3 overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[940px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><Th>버전</Th><Th>생성 / 평가</Th><Th>검증</Th><Th>변경 사유</Th><Th>생성 시각</Th><Th right>조치</Th></tr></thead><tbody className="divide-y divide-slate-100">{overview.history.map((entry) => <tr key={entry.config.id ?? `env-${entry.config.version}`}><Td><strong>v{entry.config.version}</strong>{entry.active ? <p className="mt-1 text-xs font-semibold text-emerald-700">활성</p> : null}</Td><Td>{entry.config.generatorModel}<p className="mt-1 text-xs text-slate-500">{entry.config.evaluatorModel}</p></Td><Td>{entry.config.evaluationEnabled ? `${entry.config.evaluationThreshold}점 이상 · 수정 ${entry.config.maxRevisionCount}회` : '평가 안 함'}</Td><Td><span className="block max-w-[260px] whitespace-normal">{entry.reason}</span></Td><Td>{new Date(entry.createdAt).toLocaleString('ko-KR')}</Td><Td right>{!entry.active && entry.config.id ? <button type="button" title={`버전 ${entry.config.version} 복원`} disabled={pending !== null} onClick={() => rollback(entry.config.id!, entry.config.version)} className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{pending === `rollback:${entry.config.id}` ? <LoaderCircle className="animate-spin" size={14} /> : <RotateCcw size={14} />}복원</button> : null}</Td></tr>)}{overview.history.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">아직 DB에 저장된 변경 이력이 없습니다.</td></tr> : null}</tbody></table></div>
      </section>
      {message ? <p role="status" className={`fixed bottom-5 right-5 max-w-sm rounded-md px-4 py-3 text-sm font-medium shadow-lg ${message.kind === 'error' ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white'}`}>{message.text}</p> : null}
    </div>
  );
}

function SelectField({ label, name, defaultValue, children }: { label: string; name: string; defaultValue: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-slate-700">{label}<select name={name} defaultValue={defaultValue} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{children}</select></label>; }
function NumberField({ label, name, defaultValue, min, max }: { label: string; name: string; defaultValue: number; min: number; max: number }) { return <label className="block text-sm font-medium text-slate-700">{label}<input type="number" name={name} defaultValue={defaultValue} min={min} max={max} required className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm tabular-nums" /></label>; }
function ReasoningOptions() { return <><option value="NONE">없음</option><option value="LOW">낮음</option><option value="MEDIUM">보통</option><option value="HIGH">높음</option><option value="XHIGH">매우 높음</option><option value="MAX">최대</option></>; }
function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) { return <th className={`px-4 py-3 font-medium ${right ? 'text-right' : ''}`}>{children}</th>; }
function Td({ children, right = false }: { children: React.ReactNode; right?: boolean }) { return <td className={`px-4 py-4 align-top text-slate-700 ${right ? 'text-right tabular-nums' : ''}`}>{children}</td>; }
function roleLabel(role: 'GENERATOR' | 'EVALUATOR') { return role === 'GENERATOR' ? '생성' : '평가'; }
