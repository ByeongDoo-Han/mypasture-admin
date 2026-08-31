import { TicketPercent } from 'lucide-react';
import Link from 'next/link';
import { CouponCampaignOperations } from '../../../features/coupon/CouponCampaignOperations';
import { getCouponCampaigns } from '../../../features/coupon/couponAdmin';

/** AI 목자 체험 쿠폰을 발급하고 등록률과 활성 상태를 운영하는 관리자 페이지입니다. */
export default async function CouponCampaignPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const params = await searchParams;
  const status = params.status === 'ACTIVE' || params.status === 'INACTIVE' ? params.status : undefined;
  const page = Math.max(0, Number.parseInt(params.page ?? '0', 10) || 0);
  const data = await getCouponCampaigns(status, page).catch(() => null);
  return <div className="mx-auto max-w-7xl"><header className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-emerald-50 text-emerald-800"><TicketPercent size={20} /></span><div><p className="text-sm font-medium text-emerald-700">AI 운영</p><h1 className="mt-1 text-2xl font-bold text-slate-950">체험 쿠폰</h1><p className="mt-2 text-sm text-slate-600">구독 등급을 바꾸지 않고 기간제 AI 목자 체험 권한을 안전하게 발급합니다.</p></div></header><nav aria-label="쿠폰 상태 필터" className="mb-5 flex border-b border-slate-200">{[[undefined, '전체'], ['ACTIVE', '활성'], ['INACTIVE', '중지']] .map(([value, label]) => <Link key={label} href={value ? `/coupons?status=${value}` : '/coupons'} className={`border-b-2 px-4 py-2 text-sm font-semibold ${status === value ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500'}`}>{label}</Link>)}</nav>{data ? <><CouponCampaignOperations data={data} />{data.totalPages > 1 ? <nav aria-label="쿠폰 페이지 이동" className="mt-5 flex justify-end gap-2"><PageLink disabled={data.page === 0} href={`/coupons?${status ? `status=${status}&` : ''}page=${Math.max(0, data.page - 1)}`}>이전</PageLink><PageLink disabled={data.page + 1 >= data.totalPages} href={`/coupons?${status ? `status=${status}&` : ''}page=${data.page + 1}`}>다음</PageLink></nav> : null}</> : <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">쿠폰 운영 데이터를 불러오지 못했습니다. 백엔드 연결과 관리자 권한을 확인해 주세요.</div>}</div>;
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: string }) {
  return disabled ? <span className="flex h-9 items-center border border-slate-200 px-3 text-sm text-slate-300">{children}</span> : <Link href={href} className="flex h-9 items-center border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">{children}</Link>;
}
