'use client';

import { CheckCircle2, EyeOff, LoaderCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ModerationReportPage } from './moderationAdmin';

/** 신고 문맥을 검토하고 숨김 또는 기각 결과를 사유와 함께 기록합니다. */
export function ModerationOperations({ data }: { data: ModerationReportPage }) {
  return <div className="overflow-x-auto border border-slate-200 bg-white">
    <table className="min-w-[1100px] w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500"><tr><Th>접수</Th><Th>대상</Th><Th>사유와 문맥</Th><Th>상태</Th><Th>검토</Th></tr></thead>
      <tbody className="divide-y divide-slate-100">{data.items.map((report) => <tr key={report.id} className="align-top"><Td><p className="font-semibold text-slate-900">{date(report.createdAt)}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{report.id}</p></Td><Td><p className="font-semibold text-slate-900">{report.targetType === 'AI_ANSWER' ? 'AI 답변' : 'QT 답변'}</p><p className="mt-1 font-mono text-[10px] text-slate-500">{report.targetId}</p>{report.targetUserId ? <p className="mt-2 text-xs text-slate-500">작성자 {report.targetUserId}</p> : null}</Td><Td><p className="font-semibold text-red-700">{reasonLabel(report.reason)}</p>{report.details ? <p className="mt-2 whitespace-pre-wrap text-slate-700">{report.details}</p> : null}<details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-emerald-800">신고 당시 내용 보기</summary><pre className="mt-2 max-w-xl whitespace-pre-wrap break-words border-l-2 border-slate-300 bg-slate-50 p-3 font-sans text-xs leading-5 text-slate-700">{report.targetSnapshot}</pre></details></Td><Td><Status value={report.status} />{report.action === 'CONTENT_HIDDEN' ? <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-700"><EyeOff size={14} />숨김</p> : null}{report.resolutionNote ? <p className="mt-2 max-w-56 text-xs leading-5 text-slate-500">{report.resolutionNote}</p> : null}</Td><Td>{report.status === 'OPEN' || report.status === 'IN_REVIEW' ? <ReviewControls reportId={report.id} /> : <span className="text-xs text-slate-400">처리 완료</span>}</Td></tr>)}{!data.items.length ? <tr><td colSpan={5} className="px-4 py-14 text-center text-slate-500">조건에 맞는 신고가 없습니다.</td></tr> : null}</tbody>
    </table>
  </div>;
}

function ReviewControls({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<'hide' | 'dismiss'>();
  const [message, setMessage] = useState<string>();

  async function review(kind: 'hide' | 'dismiss') {
    if (note.trim().length < 5) return setMessage('처리 사유를 5자 이상 입력해 주세요.');
    const label = kind === 'hide' ? '이 콘텐츠를 모든 사용자에게 숨김' : '신고를 기각';
    if (!window.confirm(`${label} 처리할까요?`)) return;
    setPending(kind); setMessage(undefined);
    const response = await fetch(`/api/admin/moderation/reports/${reportId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationId: crypto.randomUUID(), status: kind === 'hide' ? 'RESOLVED' : 'DISMISSED', action: kind === 'hide' ? 'CONTENT_HIDDEN' : 'NONE', note }),
    }).catch(() => null);
    setPending(undefined);
    if (!response?.ok) {
      const body = await response?.json().catch(() => null) as { message?: string } | null;
      return setMessage(body?.message ?? '신고를 처리하지 못했습니다.');
    }
    router.refresh();
  }

  return <div className="w-64"><label className="text-xs font-semibold text-slate-700">처리 사유<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full resize-y border border-slate-300 p-2 text-xs font-normal outline-none focus:border-emerald-700" placeholder="판단 근거를 기록" /></label><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" disabled={Boolean(pending)} onClick={() => void review('hide')} className="flex h-9 items-center justify-center gap-1 bg-red-700 px-2 text-xs font-bold text-white disabled:opacity-50">{pending === 'hide' ? <LoaderCircle className="animate-spin" size={14} /> : <EyeOff size={14} />}숨김</button><button type="button" disabled={Boolean(pending)} onClick={() => void review('dismiss')} className="flex h-9 items-center justify-center gap-1 border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 disabled:opacity-50">{pending === 'dismiss' ? <LoaderCircle className="animate-spin" size={14} /> : <XCircle size={14} />}기각</button></div>{message ? <p role="alert" className="mt-2 text-xs leading-4 text-red-700">{message}</p> : null}</div>;
}

function Status({ value }: { value: string }) {
  const complete = value === 'RESOLVED';
  return <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold ${complete ? 'bg-emerald-50 text-emerald-800' : value === 'DISMISSED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800'}`}>{complete ? <CheckCircle2 size={13} /> : null}{value === 'OPEN' ? '대기' : value === 'IN_REVIEW' ? '검토 중' : value === 'RESOLVED' ? '조치 완료' : '기각'}</span>;
}

function reasonLabel(value: string) {
  const labels: Record<string, string> = { OFFENSIVE: '부적절한 내용', HARASSMENT: '괴롭힘', HATE_OR_DISCRIMINATION: '혐오·차별', SEXUAL_CONTENT: '성적 내용', SELF_HARM_OR_DANGEROUS: '자해·위험 조언', PRIVACY: '개인정보', FALSE_INFORMATION: '잘못된 정보', OTHER: '기타' };
  return labels[value] ?? value;
}
function date(value: string) { return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-4">{children}</td>; }
