'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileClock, LoaderCircle, RefreshCw, Save, X } from 'lucide-react';
import type { DailyWordAdmin, DailyWordGenerationJob } from './dailyWordAdmin';

/** 날짜별 AI 초안을 원문과 대조해 편집하고 게시·반려하는 운영 화면입니다. */
export function DailyWordOperations({ words, jobs }: { words: DailyWordAdmin[]; jobs: DailyWordGenerationJob[] }) {
  const router = useRouter();
  const [date, setDate] = useState(tomorrow());
  const [reason, setReason] = useState('다음 날 오늘의 말씀 초안을 생성합니다');
  const [regenerate, setRegenerate] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const operationIds = useRef(new Map<string, string>());

  function operationIdFor(key: string) {
    const current = operationIds.current.get(key);
    if (current) return current;
    const created = crypto.randomUUID();
    operationIds.current.set(key, created);
    return created;
  }

  async function generate() {
    if (reason.trim().length < 5) return setMessage('생성 사유를 5자 이상 입력해 주세요.');
    if (!window.confirm(`${date} 초안을 ${regenerate ? '재생성' : '생성'}하시겠습니까?`)) return;
    setPending('generate'); setMessage(null);
    const response = await fetch(`/api/admin/daily-words/generate/${date}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationId: operationIdFor(`generate:${date}:${regenerate}:${reason.trim()}`), regenerate, reason: reason.trim() }),
    }).catch(() => null);
    setPending(null);
    if (!response) return setMessage('백엔드에 연결할 수 없습니다.');
    if (!response.ok) return setMessage(await errorMessage(response));
    operationIds.current.clear();
    setMessage('생성 작업을 등록했습니다. 작업 상태에서 진행 결과를 확인할 수 있습니다.');
    router.refresh();
  }

  return <div className="space-y-8">
    <section className="border-y border-slate-200 bg-white px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium text-slate-700">대상 날짜<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 block h-10 rounded-md border border-slate-300 px-3" /></label>
        <label className="min-w-[260px] flex-1 text-sm font-medium text-slate-700">생성 사유<input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
        <label className="flex h-10 items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={regenerate} onChange={(event) => setRegenerate(event.target.checked)} className="h-4 w-4 accent-emerald-700" />기존 초안 재생성</label>
        <button type="button" disabled={pending !== null} onClick={generate} className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending === 'generate' ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}초안 생성</button>
      </div>
      {message ? <p role="status" className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
    </section>

    <section>
      <div className="mb-3 flex items-center gap-2"><FileClock size={18} className="text-slate-500" /><h2 className="text-base font-semibold">최근 생성 작업</h2></div>
      <div className="overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><Th>대상일</Th><Th>상태</Th><Th>시도</Th><Th>결과</Th><Th>갱신</Th></tr></thead><tbody className="divide-y divide-slate-100">{jobs.slice(0, 10).map((job) => <tr key={job.id}><Td>{job.date}</Td><Td><Status value={job.status} /></Td><Td>{job.attemptCount}</Td><Td>{job.errorMessage ?? (job.dailyWordId ? '초안 저장 완료' : '-')}</Td><Td>{formatDate(job.updatedAt)}</Td></tr>)}{jobs.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">생성 작업이 없습니다.</td></tr> : null}</tbody></table></div>
    </section>

    <section className="space-y-4">
      <h2 className="text-base font-semibold">검수 목록</h2>
      {words.map((word) => <DailyWordEditor key={word.id} word={word} onChanged={() => router.refresh()} />)}
      {words.length === 0 ? <div className="border-y border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">조회 기간에 생성된 오늘의 말씀이 없습니다.</div> : null}
    </section>
  </div>;
}

function DailyWordEditor({ word, onChanged }: { word: DailyWordAdmin; onChanged: () => void }) {
  const [meditation, setMeditation] = useState(word.meditation);
  const [question, setQuestion] = useState(word.actionQuestion);
  const [reason, setReason] = useState('성경 원문과 묵상 내용을 검수했습니다');
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const operationIds = useRef(new Map<string, string>());
  const editable = word.status === 'DRAFT' && word.verseId !== null;

  async function send(action: 'update' | 'publish' | 'reject') {
    if (!word.verseId || reason.trim().length < 5) return setMessage('연결 절과 5자 이상의 조치 사유가 필요합니다.');
    if (action !== 'update' && !window.confirm(`${word.date} 콘텐츠를 ${action === 'publish' ? '게시' : '반려'}하시겠습니까?`)) return;
    setPending(action); setMessage(null);
    const fingerprint = `${action}:${word.id}:${word.verseId}:${meditation}:${question}:${reason.trim()}`;
    const operationId = operationIds.current.get(fingerprint) ?? crypto.randomUUID();
    operationIds.current.set(fingerprint, operationId);
    const body = action === 'update'
      ? { operationId, verseId: word.verseId, meditation, actionQuestion: question, reason: reason.trim() }
      : { operationId, reason: reason.trim() };
    const response = await fetch(`/api/admin/daily-words/${word.id}/${action}`, { method: action === 'update' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    setPending(null);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '백엔드에 연결할 수 없습니다.');
    operationIds.current.delete(fingerprint);
    setMessage(action === 'update' ? '수정 내용을 저장했습니다.' : action === 'publish' ? '게시했습니다.' : '반려했습니다.');
    onChanged();
  }

  return <article className="border-y border-slate-200 bg-white px-4 py-5 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-emerald-700">{word.date} · revision {word.contentRevision}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{word.bookName} {word.chapter}:{word.verse}</h3><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">{word.verseText}</p></div><Status value={word.status} /></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="text-sm font-medium text-slate-700">묵상<textarea disabled={!editable} value={meditation} onChange={(event) => setMeditation(event.target.value)} rows={6} maxLength={1000} className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 leading-6 disabled:bg-slate-50" /></label><label className="text-sm font-medium text-slate-700">실천 질문<textarea disabled={!editable} value={question} onChange={(event) => setQuestion(event.target.value)} rows={6} maxLength={300} className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 leading-6 disabled:bg-slate-50" /></label></div>
    <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-3"><span>모델 {word.model ?? '-'}</span><span>토큰 {word.embeddingTokens + word.promptTokens + word.completionTokens}</span><span>예상 비용 ${word.estimatedCostUsd.toFixed(6)}</span></div>
    {editable ? <div className="mt-5 flex flex-wrap items-end gap-3"><label className="min-w-[260px] flex-1 text-sm font-medium text-slate-700">조치 사유<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label><Action disabled={pending !== null} onClick={() => send('update')} icon={pending === 'update' ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}>저장</Action><Action disabled={pending !== null} onClick={() => send('reject')} icon={<X size={15} />}>반려</Action><button disabled={pending !== null} onClick={() => send('publish')} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"><Check size={15} />게시</button></div> : null}
    {word.rejectionReason ? <p className="mt-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900">반려 사유: {word.rejectionReason}</p> : null}
    {message ? <p role="status" className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
  </article>;
}

function Action({ children, icon, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode }) { return <button type="button" {...props} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">{icon}{children}</button>; }
function Status({ value }: { value: string }) { const color = value === 'PUBLISHED' || value === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800' : value === 'FAILED' || value === 'REJECTED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'; return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${color}`}>{label(value)}</span>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 font-medium">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-3 align-top text-slate-700">{children}</td>; }
function label(value: string) { return ({ DRAFT: '초안', PUBLISHED: '게시', REJECTED: '반려', PENDING: '대기', PROCESSING: '생성 중', COMPLETED: '완료', FAILED: '실패' } as Record<string, string>)[value] ?? value; }
function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
function formatDate(value: string) { return new Date(value).toLocaleString('ko-KR'); }
async function errorMessage(response: Response) { const body = await response.json().catch(() => null) as { message?: string } | null; return body?.message ?? '요청을 처리하지 못했습니다.'; }
