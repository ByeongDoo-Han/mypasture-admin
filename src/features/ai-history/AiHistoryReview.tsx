'use client';

import { useState } from 'react';
import type { AiHistoryDetail } from './aiHistoryAdmin';

type Reason = 'QUALITY_REVIEW' | 'SAFETY_REVIEW' | 'USER_SUPPORT';

/** 선택한 한 질문의 원문을 사유 기록 후에만 펼쳐 보여줍니다. */
export function AiHistoryReview({ turnId }: { turnId: string }) {
  const [reason, setReason] = useState<Reason | ''>('');
  const [detail, setDetail] = useState<AiHistoryDetail>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function open() {
    if (!reason) return setError('열람 목적을 선택해 주세요.');
    setError(undefined); setLoading(true);
    const response = await fetch(`/api/admin/ai/history/${turnId}/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }), cache: 'no-store',
    }).catch(() => null);
    setLoading(false);
    if (!response?.ok) return setError('기록을 열람하지 못했습니다. 관리자 로그인과 서버 연결을 확인해 주세요.');
    setDetail(await response.json() as AiHistoryDetail);
  }

  return <div className="mt-4 border-t border-slate-200 pt-4">
    {!detail ? <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[200px] text-xs font-semibold text-slate-600">열람 목적
        <select value={reason} onChange={(event) => setReason(event.target.value as Reason | '')} className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800">
          <option value="">선택해 주세요</option><option value="QUALITY_REVIEW">답변 품질 점검</option><option value="SAFETY_REVIEW">안전성 점검</option><option value="USER_SUPPORT">사용자 문의 대응</option>
        </select>
      </label>
      <button type="button" onClick={() => void open()} disabled={loading} className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? '불러오는 중…' : '질문·답변 보기'}</button>
    </div> : <div>
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-950">질문·답변 상세</h3><button type="button" onClick={() => setDetail(undefined)} className="text-sm font-semibold text-slate-600 underline">닫기</button></div>
      <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-800">{detail.history.question}</p>
      <div className="mt-4 space-y-4">{detail.history.versions.map((version) => <section key={version.turnId} className="border-l-2 border-emerald-600 pl-4">
        <p className="text-xs font-semibold text-emerald-700">{version.kind === 'ORIGINAL' ? '최초 답변' : '개선 답변'} · {formatDate(version.createdAt)}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{version.answer}</p>
        {version.citations.length ? <ul className="mt-3 space-y-1 text-xs text-slate-600">{version.citations.map((citation, index) => <li key={`${version.turnId}-${index}`}>{citation.book} {citation.chapter}:{citation.verse} · {citation.text}</li>)}</ul> : null}
        {version.prayer ? <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-950">{version.prayer.title}<br />{version.prayer.content}</p> : null}
      </section>)}</div>
    </div>}
    {error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}
  </div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
