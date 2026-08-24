'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CircleCheck, Eye, FileClock, LoaderCircle, MailWarning, RefreshCw, RotateCcw, Save, Search, Wrench, X } from 'lucide-react';
import type { DailyWordAdmin, DailyWordGenerationJob, DailyWordIncident, DailyWordOperationsSummary, IncidentEmailDelivery, IncidentEmailOperations } from './dailyWordAdmin';

type BibleSearchVerse = { version: string; bookCode: string; bookName: string; chapter: number; verse: number; text: string };

/** 날짜별 AI 초안을 원문과 대조해 편집하고 게시·반려하는 운영 화면입니다. */
export function DailyWordOperations({ words, jobs, summary, incidents, emailOperations }: { words: DailyWordAdmin[]; jobs: DailyWordGenerationJob[]; summary: DailyWordOperationsSummary; incidents: DailyWordIncident[]; emailOperations: IncidentEmailOperations }) {
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
    <OperationsOverview summary={summary} />
    <IncidentOperations incidents={incidents} onChanged={() => router.refresh()} />
    <EmailDeliveryOperations initial={emailOperations} />
    <ManualDraftComposer onChanged={() => router.refresh()} />

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

/** 운영 사건 알림 메일의 outbox 상태를 조회하고 실패 건을 감사 가능한 방식으로 재처리합니다. */
function EmailDeliveryOperations({ initial }: { initial: IncidentEmailOperations }) {
  const [operations, setOperations] = useState(initial);
  const [status, setStatus] = useState<'' | IncidentEmailDelivery['status']>('');
  const [from, setFrom] = useState(inputDate(initial.from));
  const [to, setTo] = useState(inputDate(initial.to));
  const [reason, setReason] = useState('발송 실패 원인을 확인하고 재처리를 요청합니다');
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const operationIds = useRef(new Map<string, string>());

  async function load(page = 0) {
    if (!from || !to || from > to) return setMessage('조회 시작일은 종료일보다 늦을 수 없습니다.');
    setPending('load'); setMessage(null);
    const query = new URLSearchParams({ from: startOfDayIso(from), to: nextDayIso(to), page: String(page), size: String(operations.size) });
    if (status) query.set('status', status);
    const response = await fetch(`/api/admin/daily-words/email-deliveries?${query}`).catch(() => null);
    setPending(null);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '백엔드에 연결할 수 없습니다.');
    setOperations(await response.json() as IncidentEmailOperations);
  }

  async function requeue(delivery: IncidentEmailDelivery) {
    if (reason.trim().length < 5) return setMessage('재처리 사유를 5자 이상 입력해 주세요.');
    if (!window.confirm(`${delivery.maskedRecipient} 발송 작업을 다시 대기열에 넣으시겠습니까?`)) return;
    const key = `${delivery.id}:${reason.trim()}`;
    const operationId = operationIds.current.get(key) ?? crypto.randomUUID();
    operationIds.current.set(key, operationId);
    setPending(delivery.id); setMessage(null);
    const response = await fetch(`/api/admin/daily-words/email-deliveries/${delivery.id}/requeue`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationId, reason: reason.trim() }),
    }).catch(() => null);
    setPending(null);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '백엔드에 연결할 수 없습니다.');
    operationIds.current.delete(key);
    setMessage('발송 작업을 대기 상태로 되돌렸습니다. 기존 시도 횟수와 오류 기록은 유지됩니다.');
    await load(operations.page);
  }

  const summary = operations.summary;
  return <section aria-labelledby="incident-email-deliveries">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div><div className="flex items-center gap-2"><MailWarning size={18} className={summary.dead > 0 ? 'text-red-600' : 'text-slate-500'} /><h2 id="incident-email-deliveries" className="text-base font-semibold">운영 사건 이메일</h2></div><p className="mt-1 text-xs text-slate-500">수신 주소는 마스킹되며 오류 메시지의 토큰과 비밀번호는 저장 전에 제거됩니다.</p></div>
      <span className="text-xs text-slate-500">총 {operations.totalElements.toLocaleString('ko-KR')}건 · {formatDate(operations.generatedAt)} 기준</span>
    </div>

    <div className="grid border-y border-slate-200 bg-white sm:grid-cols-5 sm:divide-x sm:divide-slate-200">
      <EmailMetric label="대기" value={summary.pending} />
      <EmailMetric label="처리 중" value={summary.processing} />
      <EmailMetric label="재시도 대기" value={summary.retryWait} tone={summary.retryWait > 0 ? 'warning' : 'default'} />
      <EmailMetric label="발송 완료" value={summary.sent} tone="success" />
      <EmailMetric label="최종 실패" value={summary.dead} tone={summary.dead > 0 ? 'danger' : 'default'} />
    </div>

    <div className="mt-4 grid items-end gap-3 border-y border-slate-200 bg-white px-4 py-4 sm:grid-cols-2 lg:grid-cols-[150px_150px_180px_1fr_auto]">
      <label className="text-sm font-medium text-slate-700">시작일<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">종료일<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">상태<select value={status} onChange={(event) => setStatus(event.target.value as '' | IncidentEmailDelivery['status'])} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="">전체</option>{(['PENDING', 'PROCESSING', 'RETRY_WAIT', 'SENT', 'DEAD'] as const).map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">재처리 사유<input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <button type="button" disabled={pending !== null} onClick={() => void load(0)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">{pending === 'load' ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}조회</button>
    </div>

    {summary.dead > 0 ? <div role="alert" className="mt-3 flex items-start gap-2 border-l-4 border-red-600 bg-red-50 px-3 py-3 text-sm text-red-900"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><p>최종 실패 {summary.dead}건이 있습니다. 외부 메일 설정과 오류 요약을 확인한 뒤 필요한 건만 재처리해 주세요.</p></div> : null}

    <div className="mt-4 overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><Th>상태</Th><Th>운영 사건</Th><Th>수신자</Th><Th>시도</Th><Th>다음 처리 / 완료</Th><Th>오류 요약</Th><Th>조치</Th></tr></thead><tbody className="divide-y divide-slate-100">{operations.deliveries.map((delivery) => <tr key={delivery.id}><Td><Status value={delivery.status} /></Td><Td><span className="font-semibold text-slate-800">{delivery.incidentDate} · {label(delivery.incidentType)}</span><span className="mt-1 block text-xs text-slate-500">{label(delivery.incidentSeverity)} · 알림 v{delivery.notificationVersion}</span></Td><Td>{delivery.maskedRecipient}</Td><Td>{delivery.attemptCount}회</Td><Td>{formatDate(delivery.sentAt ?? delivery.nextAttemptAt)}</Td><Td><span className="block max-w-[280px] break-words text-xs leading-5">{delivery.errorSummary ?? '-'}</span></Td><Td>{delivery.requeueAllowed ? <button type="button" disabled={pending !== null} onClick={() => void requeue(delivery)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">{pending === delivery.id ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />}재처리</button> : <span className="text-xs text-slate-400">-</span>}</Td></tr>)}{operations.deliveries.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">조건에 맞는 이메일 발송 작업이 없습니다.</td></tr> : null}</tbody></table></div>

    <div className="mt-3 flex items-center justify-between gap-3">
      <button type="button" aria-label="이전 페이지" disabled={pending !== null || operations.page === 0} onClick={() => void load(operations.page - 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 disabled:opacity-40"><ChevronLeft size={17} /></button>
      <p className="text-xs text-slate-500">{operations.totalPages === 0 ? 0 : operations.page + 1} / {operations.totalPages} 페이지</p>
      <button type="button" aria-label="다음 페이지" disabled={pending !== null || !operations.hasNext} onClick={() => void load(operations.page + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 disabled:opacity-40"><ChevronRight size={17} /></button>
    </div>
    {message ? <p role="status" className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
  </section>;
}

function EmailMetric({ label: title, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warning' | 'success' | 'danger' }) {
  const color = tone === 'danger' ? 'text-red-700' : tone === 'warning' ? 'text-amber-800' : tone === 'success' ? 'text-emerald-800' : 'text-slate-950';
  return <div className="border-b border-slate-100 px-4 py-3 last:border-b-0 sm:border-b-0"><p className="text-xs text-slate-500">{title}</p><p className={`mt-1 text-lg font-bold ${color}`}>{value.toLocaleString('ko-KR')}건</p></div>;
}

function OperationsOverview({ summary }: { summary: DailyWordOperationsSummary }) {
  const attention = summary.content.datesNeedingAttention;
  const activeJobs = summary.jobs.pending + summary.jobs.processing;
  const totalTokens = summary.usage.embeddingTokens + summary.usage.promptTokens + summary.usage.completionTokens;
  const needsAction = summary.tomorrow.status !== 'PUBLISHED' || summary.jobs.failed > 0;

  return <section aria-labelledby="daily-word-readiness">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><h2 id="daily-word-readiness" className="text-base font-semibold text-slate-950">게시 준비 현황</h2><p className="mt-1 text-xs text-slate-500">{summary.from} ~ {summary.to} · {formatDate(summary.generatedAt)} 기준</p></div>
      <p className="text-xs text-slate-500">확인 필요 {attention.length}일</p>
    </div>
    <div className="mt-3 grid border-y border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-slate-200">
      <ReadinessMetric label="오늘" date={summary.today.date} status={summary.today.status} />
      <ReadinessMetric label="내일" date={summary.tomorrow.date} status={summary.tomorrow.status} />
      <Metric label="생성 작업" value={`${activeJobs}건 활성`} detail={`완료 ${summary.jobs.completed} · 실패 ${summary.jobs.failed} · 취소 ${summary.jobs.cancelled}`} tone={summary.jobs.failed > 0 ? 'danger' : 'default'} />
      <Metric label="AI 사용량" value={`${totalTokens.toLocaleString('ko-KR')} 토큰`} detail={`예상 $${summary.usage.estimatedCostUsd.toFixed(6)}`} />
    </div>
    {needsAction ? <div role="alert" className="mt-3 flex items-start gap-2 border-l-4 border-amber-500 bg-amber-50 px-3 py-3 text-sm text-amber-950"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><p>{summary.tomorrow.status !== 'PUBLISHED' ? `내일(${summary.tomorrow.date}) 게시본을 준비해야 합니다.` : '내일 게시본은 준비됐습니다.'}{summary.jobs.failed > 0 ? ` 생성 실패 ${summary.jobs.failed}건의 원인을 확인해 주세요.` : ''}</p></div> : <div className="mt-3 flex items-center gap-2 border-l-4 border-emerald-600 bg-emerald-50 px-3 py-3 text-sm text-emerald-900"><CircleCheck size={17} /><p>내일 게시본이 준비됐고 조회 범위에 실패 작업이 없습니다.</p></div>}
    {attention.length > 0 ? <p className="mt-3 text-xs leading-5 text-slate-500">게시 확인 날짜: {attention.slice(0, 8).join(', ')}{attention.length > 8 ? ` 외 ${attention.length - 8}일` : ''}</p> : null}
  </section>;
}

function IncidentOperations({ incidents, onChanged }: { incidents: DailyWordIncident[]; onChanged: () => void }) {
  const active = incidents.filter((incident) => incident.status !== 'RESOLVED');
  return <section aria-labelledby="daily-word-incidents">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><AlertTriangle size={18} className={active.length > 0 ? 'text-red-600' : 'text-slate-500'} /><h2 id="daily-word-incidents" className="text-base font-semibold">운영 사건</h2></div><span className="text-xs text-slate-500">미해결 {active.length}건</span></div>
    <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
      {incidents.slice(0, 20).map((incident) => <IncidentRow key={incident.id} incident={incident} onChanged={onChanged} />)}
      {incidents.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-500">감지된 운영 사건이 없습니다.</p> : null}
    </div>
  </section>;
}

function IncidentRow({ incident, onChanged }: { incident: DailyWordIncident; onChanged: () => void }) {
  const [reason, setReason] = useState('운영 상태와 복구 필요 여부를 확인했습니다');
  const [pending, setPending] = useState<'acknowledge' | 'resolve' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const operationIds = useRef(new Map<string, string>());

  async function act(action: 'acknowledge' | 'resolve') {
    if (reason.trim().length < 5) return setMessage('조치 사유를 5자 이상 입력해 주세요.');
    if (action === 'resolve' && !window.confirm('실제로 복구됐는지 확인하셨습니까?')) return;
    const key = `${action}:${incident.id}:${reason.trim()}`;
    const operationId = operationIds.current.get(key) ?? crypto.randomUUID();
    operationIds.current.set(key, operationId);
    setPending(action); setMessage(null);
    const response = await fetch(`/api/admin/daily-words/incidents/${incident.id}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operationId, reason: reason.trim() }),
    }).catch(() => null);
    setPending(null);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '백엔드에 연결할 수 없습니다.');
    operationIds.current.delete(key);
    setMessage(action === 'acknowledge' ? '확인 처리했습니다.' : '해결 처리했습니다.');
    onChanged();
  }

  return <article className="px-4 py-4 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Status value={incident.severity} /><Status value={incident.status} /><span className="text-xs font-semibold text-slate-600">{incident.date} · {label(incident.type)}</span></div><p className="mt-2 break-words text-sm leading-6 text-slate-800">{incident.message}</p><p className="mt-1 text-xs text-slate-500">최초 {formatDate(incident.firstDetectedAt)} · 최근 {formatDate(incident.lastDetectedAt)} · 감지 {incident.occurrenceCount}회</p></div></div>
    {incident.status !== 'RESOLVED' ? <div className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-[240px] flex-1 text-sm font-medium text-slate-700">조치 사유<input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>{incident.status === 'OPEN' ? <Action disabled={pending !== null} onClick={() => act('acknowledge')} icon={pending === 'acknowledge' ? <LoaderCircle size={15} className="animate-spin" /> : <Eye size={15} />}>확인</Action> : null}<button type="button" disabled={pending !== null} onClick={() => act('resolve')} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending === 'resolve' ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}해결</button></div> : incident.resolutionNote ? <p className="mt-3 text-xs text-slate-500">해결 기록: {incident.resolutionNote}</p> : null}
    {message ? <p role="status" className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
  </article>;
}

function ManualDraftComposer({ onChanged }: { onChanged: () => void }) {
  const [date, setDate] = useState(tomorrow());
  const [keyword, setKeyword] = useState('평안');
  const [results, setResults] = useState<BibleSearchVerse[]>([]);
  const [selected, setSelected] = useState<BibleSearchVerse | null>(null);
  const [meditation, setMeditation] = useState('하나님의 말씀 안에서 오늘의 상황을 돌아보고, 주어진 자리에서 믿음으로 한 걸음을 선택해 봅니다.');
  const [question, setQuestion] = useState('오늘 이 말씀을 따라 실천할 수 있는 한 가지는 무엇인가요?');
  const [reason, setReason] = useState('자동 생성 장애에 대비한 관리자 수동 초안입니다');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [pending, setPending] = useState<'search' | 'save' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const operationIds = useRef(new Map<string, string>());

  async function search() {
    if (keyword.trim().length < 2) return setMessage('검색어를 2자 이상 입력해 주세요.');
    setPending('search'); setMessage(null);
    const response = await fetch(`/api/admin/bibles/search?version=KOR1910&keyword=${encodeURIComponent(keyword.trim())}`).catch(() => null);
    setPending(null);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '검색 서버에 연결할 수 없습니다.');
    const body = await response.json() as BibleSearchVerse[];
    setResults(body); setSelected(body[0] ?? null);
    if (body.length === 0) setMessage('검색된 성경 구절이 없습니다.');
  }

  async function save() {
    if (!selected) return setMessage('먼저 성경 구절을 선택해 주세요.');
    if (meditation.trim().length < 30 || question.trim().length < 10 || reason.trim().length < 5) return setMessage('묵상, 실천 질문, 조치 사유의 최소 길이를 확인해 주세요.');
    if (!window.confirm(`${date} 수동 초안을 저장하시겠습니까?`)) return;
    const fingerprint = `${date}:${selected.version}:${selected.bookCode}:${selected.chapter}:${selected.verse}:${meditation}:${question}:${replaceExisting}:${reason}`;
    const operationId = operationIds.current.get(fingerprint) ?? crypto.randomUUID();
    operationIds.current.set(fingerprint, operationId);
    setPending('save'); setMessage(null);
    const response = await fetch(`/api/admin/daily-words/manual/${date}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationId, version: selected.version, bookCode: selected.bookCode, chapter: selected.chapter, verse: selected.verse, meditation: meditation.trim(), actionQuestion: question.trim(), replaceExisting, reason: reason.trim() }),
    }).catch(() => null);
    setPending(null);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '백엔드에 연결할 수 없습니다.');
    operationIds.current.delete(fingerprint);
    setMessage('수동 초안을 저장했습니다. 검수 목록에서 확인 후 게시해 주세요.');
    onChanged();
  }

  return <section aria-labelledby="manual-draft" className="border-y border-slate-200 bg-white px-4 py-5 sm:px-6">
    <div className="flex items-center gap-2"><Wrench size={18} className="text-slate-600" /><h2 id="manual-draft" className="text-base font-semibold">수동 복구 초안</h2></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr_auto]"><label className="text-sm font-medium text-slate-700">대상 날짜<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label><label className="text-sm font-medium text-slate-700">성경 검색<input value={keyword} maxLength={50} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label><button type="button" disabled={pending !== null} onClick={search} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">{pending === 'search' ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}검색</button></div>
    {results.length > 0 ? <div className="mt-4 max-h-64 overflow-y-auto border-y border-slate-200 divide-y divide-slate-100">{results.map((result) => { const key = `${result.bookCode}-${result.chapter}-${result.verse}`; const active = selected?.bookCode === result.bookCode && selected.chapter === result.chapter && selected.verse === result.verse; return <button type="button" key={key} onClick={() => setSelected(result)} className={`block w-full px-3 py-3 text-left text-sm ${active ? 'bg-emerald-50 text-emerald-950' : 'bg-white text-slate-700 hover:bg-slate-50'}`}><strong>{result.bookName} {result.chapter}:{result.verse}</strong><span className="mt-1 block leading-6">{result.text}</span></button>; })}</div> : null}
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><label className="text-sm font-medium text-slate-700">묵상<textarea value={meditation} onChange={(event) => setMeditation(event.target.value)} rows={5} maxLength={1000} className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 leading-6" /></label><label className="text-sm font-medium text-slate-700">실천 질문<textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={5} maxLength={300} className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 leading-6" /></label></div>
    <div className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-[260px] flex-1 text-sm font-medium text-slate-700">복구 사유<input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label><label className="flex h-10 items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} className="h-4 w-4 accent-emerald-700" />기존 미게시 콘텐츠 교체</label><button type="button" disabled={pending !== null || !selected} onClick={save} className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending === 'save' ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}수동 초안 저장</button></div>
    {message ? <p role="status" className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
  </section>;
}

function ReadinessMetric({ label: title, date, status }: { label: string; date: string; status: 'MISSING' | 'DRAFT' | 'PUBLISHED' | 'REJECTED' }) {
  const tone = status === 'PUBLISHED' ? 'text-emerald-800' : status === 'REJECTED' ? 'text-red-700' : 'text-amber-800';
  return <div className="min-w-0 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(4)]:border-b-0 lg:border-b-0"><p className="text-xs font-medium text-slate-500">{title} · {date}</p><p className={`mt-2 text-lg font-bold ${tone}`}>{label(status)}</p><p className="mt-1 text-xs text-slate-500">{readinessHelp(status)}</p></div>;
}

function Metric({ label: title, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'danger' }) {
  return <div className="min-w-0 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(4)]:border-b-0 lg:border-b-0"><p className="text-xs font-medium text-slate-500">{title}</p><p className={`mt-2 break-words text-lg font-bold ${tone === 'danger' ? 'text-red-700' : 'text-slate-950'}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function readinessHelp(status: 'MISSING' | 'DRAFT' | 'PUBLISHED' | 'REJECTED') { return ({ MISSING: '생성 필요', DRAFT: '관리자 검수 필요', PUBLISHED: '사용자 노출 준비 완료', REJECTED: '재생성 또는 수정 필요' } as const)[status]; }

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
function Status({ value }: { value: string }) { const color = value === 'PUBLISHED' || value === 'COMPLETED' || value === 'RESOLVED' || value === 'SENT' ? 'bg-emerald-50 text-emerald-800' : value === 'FAILED' || value === 'REJECTED' || value === 'CRITICAL' || value === 'DEAD' ? 'bg-red-50 text-red-800' : value === 'CANCELLED' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'; return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${color}`}>{label(value)}</span>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 font-medium">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-3 align-top text-slate-700">{children}</td>; }
function label(value: string) { return ({ MISSING: '없음', DRAFT: '초안', PUBLISHED: '게시', REJECTED: '반려', PENDING: '대기', PROCESSING: '처리 중', RETRY_WAIT: '재시도 대기', SENT: '발송 완료', DEAD: '최종 실패', COMPLETED: '완료', FAILED: '실패', CANCELLED: '취소', OPEN: '열림', ACKNOWLEDGED: '확인', RESOLVED: '해결', WARNING: '주의', CRITICAL: '긴급', PUBLISHING_MISSING: '게시 누락', GENERATION_FAILED: '생성 실패', GENERATION_STALLED: '생성 지연' } as Record<string, string>)[value] ?? value; }
function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
function formatDate(value: string) { return new Date(value).toLocaleString('ko-KR'); }
function startOfDayIso(value: string) { return new Date(`${value}T00:00:00`).toISOString(); }
function nextDayIso(value: string) { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + 1); return date.toISOString(); }
function inputDate(value: string) { const date = new Date(value); return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
async function errorMessage(response: Response) { const body = await response.json().catch(() => null) as { message?: string } | null; return body?.message ?? '요청을 처리하지 못했습니다.'; }
