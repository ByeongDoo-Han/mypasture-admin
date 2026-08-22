'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, LoaderCircle, QrCode } from 'lucide-react';

/** 사유와 멱등 키를 사용해 강제 종료와 QR 폐기를 BFF에 요청하는 운영 조치 패널입니다. */
export function QuietTimeAdminActions({
  sessionId, sessionClosed, qrRevocable,
}: { sessionId: string; sessionClosed: boolean; qrRevocable: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<'close' | 'revoke-qr' | null>(null);
  const [retryOperation, setRetryOperation] = useState<{
    action: 'close' | 'revoke-qr'; operationId: string;
  } | null>(null);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function execute(action: 'close' | 'revoke-qr') {
    const normalized = reason.trim();
    if (normalized.length < 5) {
      setMessage({ type: 'error', text: '조치 사유를 5자 이상 입력해 주세요.' });
      return;
    }
    const label = action === 'close' ? '모임을 강제 종료' : '현재 QR을 폐기';
    if (!window.confirm(`${label}하시겠습니까?`)) return;
    const operationId = retryOperation?.action === action
      ? retryOperation.operationId
      : crypto.randomUUID();
    setRetryOperation({ action, operationId });
    setPending(action);
    setMessage(null);
    const response = await fetch(`/api/admin/quiet-time/sessions/${sessionId}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationId, reason: normalized }),
    }).catch(() => null);
    setPending(null);
    if (!response?.ok) {
      const body = await response?.json().catch(() => null) as { message?: string } | null;
      setMessage({ type: 'error', text: body?.message ?? '운영 조치를 처리하지 못했습니다.' });
      return;
    }
    setRetryOperation(null);
    setReason('');
    setMessage({ type: 'success', text: `${label}했습니다.` });
    router.refresh();
  }

  return (
    <section className="border-t border-slate-200 pt-6">
      <h2 className="text-base font-semibold text-slate-950">운영 조치</h2>
      <label htmlFor="admin-reason" className="mt-4 block text-sm font-medium text-slate-700">조치 사유</label>
      <textarea id="admin-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={4} className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="감사 로그에 남길 구체적인 사유" />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={!qrRevocable || pending !== null} onClick={() => execute('revoke-qr')} className="flex h-10 items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-45">
          {pending === 'revoke-qr' ? <LoaderCircle className="animate-spin" size={16} /> : <QrCode size={16} />}QR 폐기
        </button>
        <button type="button" disabled={sessionClosed || pending !== null} onClick={() => execute('close')} className="flex h-10 items-center justify-center gap-2 rounded-md bg-red-700 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
          {pending === 'close' ? <LoaderCircle className="animate-spin" size={16} /> : <Ban size={16} />}강제 종료
        </button>
      </div>
      {message ? <p role="status" className={`mt-3 text-sm ${message.type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{message.text}</p> : null}
    </section>
  );
}
