'use client';

import { Copy, PauseCircle, Plus, TicketPercent } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import type { CouponCampaignPage } from './couponAdmin';

type Message = { kind: 'success' | 'error'; text: string };

/** 무료 이벤트 보상 캠페인 생성, 최초 코드 전달과 비활성화를 제공하는 운영 화면입니다. */
export function CouponCampaignOperations({ data }: { data: CouponCampaignPage }) {
  const router = useRouter();
  const [codeType, setCodeType] = useState<'SHARED' | 'UNIQUE'>('SHARED');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>();
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setMessage(undefined); setGeneratedCodes([]);
    const payload = {
      operationId: crypto.randomUUID(), name: String(form.get('name') ?? ''), eligibilityKey: String(form.get('eligibilityKey') ?? ''), codeType,
      redeemStartsAt: new Date(String(form.get('startsAt'))).toISOString(), redeemEndsAt: new Date(String(form.get('endsAt'))).toISOString(),
      maxRedemptions: codeType === 'SHARED' ? Number(form.get('maxRedemptions')) : null,
      codeCount: codeType === 'UNIQUE' ? Number(form.get('codeCount')) : null,
      sharedCode: codeType === 'SHARED' && form.get('sharedCode') ? String(form.get('sharedCode')) : null,
      rewardType: 'PASTURE_DECORATION_ITEM', rewardItemCode: String(form.get('rewardItemCode') ?? ''),
      rewardQuantity: Number(form.get('rewardQuantity')), reason: String(form.get('reason') ?? ''),
    };
    const response = await fetch('/api/admin/coupons/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => null) as { generatedCodes?: string[]; message?: string } | null;
    setBusy(false);
    if (!response.ok) return setMessage({ kind: 'error', text: result?.message ?? '캠페인을 생성하지 못했습니다.' });
    setGeneratedCodes(result?.generatedCodes ?? []); setMessage({ kind: 'success', text: '이벤트 보상 캠페인을 생성했습니다. 코드는 지금 한 번만 안전하게 보관해 주세요.' });
    event.currentTarget.reset(); router.refresh();
  }

  async function deactivate(id: string, name: string) {
    const reason = window.prompt(`'${name}' 캠페인의 신규 등록을 중지하는 사유를 입력해 주세요.`);
    if (!reason || reason.trim().length < 5) return;
    if (!window.confirm('이미 지급된 꾸미기 아이템은 유지되고 신규 등록만 중지됩니다. 계속할까요?')) return;
    setBusy(true); setMessage(undefined);
    const response = await fetch(`/api/admin/coupons/campaigns/${id}/deactivate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operationId: crypto.randomUUID(), reason }),
    });
    const result = await response.json().catch(() => null) as { message?: string } | null;
    setBusy(false); setMessage(response.ok ? { kind: 'success', text: '캠페인의 신규 등록을 중지했습니다.' } : { kind: 'error', text: result?.message ?? '캠페인을 중지하지 못했습니다.' });
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="border-t border-slate-200 pt-5">
        <div className="mb-4 flex items-center gap-2"><Plus size={18} className="text-emerald-700" /><h2 className="text-lg font-bold text-slate-950">새 캠페인</h2></div>
        <form onSubmit={create} className="grid gap-4 lg:grid-cols-4">
          <Field label="캠페인 이름"><input required name="name" minLength={2} maxLength={100} className={inputClass} placeholder="가을 QT 참여 보상" /></Field>
          <Field label="중복 방지 키"><input required name="eligibilityKey" minLength={2} maxLength={80} className={inputClass} defaultValue="autumn-qt-reward-2026" /></Field>
          <Field label="등록 시작"><input required name="startsAt" type="datetime-local" className={inputClass} /></Field>
          <Field label="등록 종료"><input required name="endsAt" type="datetime-local" className={inputClass} /></Field>
          <div className="lg:col-span-2"><span className="text-sm font-medium text-slate-700">코드 방식</span><div className="mt-2 inline-flex border border-slate-300 bg-white p-1">{(['SHARED', 'UNIQUE'] as const).map((value) => <button key={value} type="button" onClick={() => setCodeType(value)} className={`h-9 px-4 text-sm font-semibold ${codeType === value ? 'bg-emerald-700 text-white' : 'text-slate-600'}`}>{value === 'SHARED' ? '공유 코드' : '개별 코드'}</button>)}</div></div>
          {codeType === 'SHARED' ? <><Field label="공유 코드 (비우면 자동 생성)"><input name="sharedCode" minLength={8} maxLength={40} className={inputClass} placeholder="PASTURE-GIFT-2026" /></Field><Field label="전체 등록 한도"><input required name="maxRedemptions" type="number" min={1} max={1_000_000} defaultValue={100} className={inputClass} /></Field></> : <Field label="개별 코드 수량"><input required name="codeCount" type="number" min={1} max={1000} defaultValue={100} className={inputClass} /></Field>}
          <Field label="꾸미기 아이템 코드"><input required name="rewardItemCode" minLength={2} maxLength={80} pattern="[A-Za-z0-9_-]+" defaultValue="PASTURE_SPROUT" className={inputClass} /></Field>
          <Field label="지급 수량"><input required name="rewardQuantity" type="number" min={1} max={100} defaultValue={1} className={inputClass} /></Field>
          <div className="lg:col-span-3"><Field label="발급 사유"><input required name="reason" minLength={5} maxLength={500} className={inputClass} placeholder="대상과 배포 채널을 포함해 입력" /></Field></div>
          <div className="flex items-end"><button disabled={busy} className="flex h-10 w-full items-center justify-center gap-2 bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50"><TicketPercent size={17} />캠페인 생성</button></div>
        </form>
        {message ? <p role="status" className={`mt-4 border-l-4 px-4 py-3 text-sm ${message.kind === 'success' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-red-600 bg-red-50 text-red-900'}`}>{message.text}</p> : null}
        {generatedCodes.length ? <div className="mt-4 border border-amber-300 bg-amber-50 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-amber-950">최초 발급 코드 {generatedCodes.length.toLocaleString('ko-KR')}개</h3><p className="mt-1 text-xs text-amber-800">이 화면을 벗어나면 원문을 다시 조회할 수 없습니다.</p></div><button type="button" title="코드 복사" onClick={() => void navigator.clipboard.writeText(generatedCodes.join('\n'))} className="flex h-9 items-center gap-2 border border-amber-400 bg-white px-3 text-sm font-semibold text-amber-900"><Copy size={16} />복사</button></div><textarea readOnly value={generatedCodes.join('\n')} className="mt-3 h-36 w-full resize-none border border-amber-300 bg-white p-3 font-mono text-xs text-slate-900" /></div> : null}
      </section>

      <section><h2 className="mb-3 text-lg font-bold text-slate-950">캠페인 현황</h2><div className="overflow-x-auto border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500"><tr><Th>캠페인</Th><Th>방식</Th><Th>등록 기간</Th><Th>사용량</Th><Th>꾸미기 보상</Th><Th>상태</Th><Th>작업</Th></tr></thead><tbody className="divide-y divide-slate-100 bg-white">{data.items.map((item) => <tr key={item.id}><Td><p className="font-semibold text-slate-950">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.eligibilityKey}</p></Td><Td>{item.codeType === 'SHARED' ? '공유' : '개별'}</Td><Td>{date(item.redeemStartsAt)}<br />~ {date(item.redeemEndsAt)}</Td><Td><strong>{item.redeemedCount.toLocaleString('ko-KR')}</strong> / {item.maxRedemptions.toLocaleString('ko-KR')}<div className="mt-2 h-1.5 w-28 bg-slate-100"><div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, item.redeemedCount / item.maxRedemptions * 100)}%` }} /></div></Td><Td><span className="font-mono text-xs">{item.rewardItemCode}</span><br />{item.rewardQuantity}개</Td><Td><span className={`inline-flex px-2 py-1 text-xs font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{item.status === 'ACTIVE' ? '활성' : '중지'}</span></Td><Td>{item.status === 'ACTIVE' ? <button type="button" disabled={busy} title="캠페인 중지" onClick={() => void deactivate(item.id, item.name)} className="inline-flex h-9 items-center gap-2 border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-50"><PauseCircle size={15} />중지</button> : '-'}</Td></tr>)}{!data.items.length ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">조건에 맞는 이벤트 보상 캠페인이 없습니다.</td></tr> : null}</tbody></table></div><p className="mt-3 text-right text-xs text-slate-500">전체 {data.totalElements.toLocaleString('ko-KR')}개 · {data.page + 1}/{Math.max(data.totalPages, 1)} 페이지</p></section>
    </div>
  );
}

const inputClass = 'mt-2 h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-700';
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-medium text-slate-700">{label}{children}</label>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="whitespace-nowrap px-4 py-4 align-top text-slate-700">{children}</td>; }
function date(value: string) { return new Intl.DateTimeFormat('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
