'use client';

import { AlertTriangle, BellRing, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { NotificationOperations } from './notificationAdmin';

/** broadcast, provider 접수와 앱 열람을 서로 다른 지표로 보여주는 알림 운영 화면입니다. */
export function NotificationOperationsView({ initial }: { initial: NotificationOperations }) {
  const [operations, setOperations] = useState(initial);
  const [type, setType] = useState<'' | 'DAILY_WORD'>('');
  const [from, setFrom] = useState(inputDate(initial.from));
  const [to, setTo] = useState(inputDate(initial.to));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load(page = 0) {
    if (!from || !to || from > to) return setMessage('조회 시작일은 종료일보다 늦을 수 없습니다.');
    setPending(true); setMessage(null);
    const query = new URLSearchParams({ from: startOfDayIso(from), to: nextDayIso(to), page: String(page), size: String(operations.size) });
    if (type) query.set('type', type);
    const response = await fetch(`/api/admin/notifications/operations?${query}`).catch(() => null);
    setPending(false);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '백엔드에 연결할 수 없습니다.');
    setOperations(await response.json() as NotificationOperations);
  }

  const summary = operations.summary;
  return <div className="space-y-6">
    <section aria-label="알림 핵심 지표" className="grid border-y border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-3 xl:divide-x xl:divide-slate-200">
      <Metric label="공통 알림" value={summary.broadcasts} detail="사용자 수와 무관한 broadcast" />
      <Metric label="Provider 접수" value={summary.sentToProvider} detail={`기기 작업 ${summary.deviceDeliveries.toLocaleString('ko-KR')}건`} tone="success" />
      <Metric label="앱 수신" value={summary.receivedByApp} detail="실행 중 앱이 ACK한 기기 수" />
      <Metric label="푸시 열기" value={summary.openedFromPush} detail="시스템 알림을 눌러 연 기기 수" />
      <Metric label="인앱 읽음" value={summary.readInApp} detail="알림센터 읽음 사용자 수" />
      <Metric label="최종 실패" value={summary.dead} detail={`재시도 대기 ${summary.retryWait.toLocaleString('ko-KR')}건`} tone={summary.dead > 0 ? 'danger' : 'default'} />
    </section>

    <div className="flex items-start gap-2 border-l-4 border-blue-600 bg-blue-50 px-3 py-3 text-sm text-blue-950"><BellRing size={17} className="mt-0.5 shrink-0" /><p>Provider 접수는 실제 기기 도착을 보장하지 않습니다. 앱 수신은 앱 코드가 실행된 경우에만 기록되므로, 특히 iOS 종료 상태의 완전한 전달률로 해석하면 안 됩니다.</p></div>
    {summary.dead > 0 ? <div role="alert" className="flex items-start gap-2 border-l-4 border-red-600 bg-red-50 px-3 py-3 text-sm text-red-900"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><p>최종 실패 {summary.dead}건이 있습니다. 비활성 토큰 비율과 FCM 오류 코드를 서버 로그에서 확인해 주세요.</p></div> : null}

    <section className="grid items-end gap-3 border-y border-slate-200 bg-white px-4 py-4 sm:grid-cols-2 lg:grid-cols-[160px_160px_190px_auto]">
      <label className="text-sm font-medium text-slate-700">시작일<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">종료일<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">알림 유형<select value={type} onChange={(event) => setType(event.target.value as '' | 'DAILY_WORD')} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="">전체</option><option value="DAILY_WORD">오늘의 말씀</option></select></label>
      <button type="button" disabled={pending} onClick={() => void load(0)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}조회</button>
    </section>

    <section>
      <div className="mb-3 flex items-end justify-between gap-3"><h2 className="text-base font-semibold text-slate-950">공통 알림 내역</h2><span className="text-xs text-slate-500">총 {operations.totalElements.toLocaleString('ko-KR')}건 · {formatDate(operations.generatedAt)} 기준</span></div>
      <div className="overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><Th>게시</Th><Th>유형</Th><Th>내용</Th><Th>기기 작업</Th><Th>Provider 접수</Th><Th>앱 수신</Th><Th>푸시 열기</Th><Th>인앱 읽음</Th><Th>최종 실패</Th></tr></thead><tbody className="divide-y divide-slate-100">{operations.broadcasts.map((broadcast) => <tr key={broadcast.id}><Td>{formatDate(broadcast.publishedAt)}</Td><Td><Status>오늘의 말씀</Status></Td><Td><strong className="block text-slate-800">{broadcast.title}</strong><span className="mt-1 block text-xs text-slate-500">{broadcast.body}</span></Td><Td>{broadcast.deviceDeliveries.toLocaleString('ko-KR')}</Td><Td>{broadcast.sentToProvider.toLocaleString('ko-KR')}</Td><Td>{broadcast.receivedByApp.toLocaleString('ko-KR')}</Td><Td>{broadcast.openedFromPush.toLocaleString('ko-KR')}</Td><Td>{broadcast.readInApp.toLocaleString('ko-KR')}</Td><Td><span className={broadcast.dead > 0 ? 'font-semibold text-red-700' : ''}>{broadcast.dead.toLocaleString('ko-KR')}</span></Td></tr>)}{operations.broadcasts.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">조건에 맞는 알림이 없습니다.</td></tr> : null}</tbody></table></div>
      <div className="mt-3 flex items-center justify-between gap-3"><button type="button" aria-label="이전 페이지" disabled={pending || operations.page === 0} onClick={() => void load(operations.page - 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 disabled:opacity-40"><ChevronLeft size={17} /></button><p className="text-xs text-slate-500">{operations.totalPages === 0 ? 0 : operations.page + 1} / {operations.totalPages} 페이지</p><button type="button" aria-label="다음 페이지" disabled={pending || !operations.hasNext} onClick={() => void load(operations.page + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 disabled:opacity-40"><ChevronRight size={17} /></button></div>
      {message ? <p role="status" className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
    </section>
  </div>;
}

function Metric({ label, value, detail, tone = 'default' }: { label: string; value: number; detail: string; tone?: 'default' | 'success' | 'danger' }) { const color = tone === 'danger' ? 'text-red-700' : tone === 'success' ? 'text-emerald-800' : 'text-slate-950'; return <div className="border-b border-slate-100 px-4 py-4 last:border-b-0 sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(4)]:border-b-0 xl:border-b-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-2 text-xl font-bold ${color}`}>{value.toLocaleString('ko-KR')}건</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function Status({ children }: { children: React.ReactNode }) { return <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">{children}</span>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 font-medium">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-3 align-top text-slate-700">{children}</td>; }
function inputDate(value: string) { const date = new Date(value); return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
function startOfDayIso(value: string) { return new Date(`${value}T00:00:00`).toISOString(); }
function nextDayIso(value: string) { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + 1); return date.toISOString(); }
function formatDate(value: string) { return new Date(value).toLocaleString('ko-KR'); }
async function errorMessage(response: Response) { const body = await response.json().catch(() => null) as { message?: string } | null; return body?.message ?? '요청을 처리하지 못했습니다.'; }
