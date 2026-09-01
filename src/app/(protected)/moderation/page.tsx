import { Flag } from 'lucide-react';
import Link from 'next/link';
import { ModerationOperations } from '../../../features/moderation/ModerationOperations';
import { getModerationReports, moderationStatusSchema, moderationTargetTypeSchema } from '../../../features/moderation/moderationAdmin';

/** AI·QT 신고를 조회하고 감사 가능한 운영 조치를 수행하는 관리자 페이지입니다. */
export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ status?: string; targetType?: string; page?: string }> }) {
  const params = await searchParams;
  const status = moderationStatusSchema.safeParse(params.status).data;
  const targetType = moderationTargetTypeSchema.safeParse(params.targetType).data;
  const page = Math.max(0, Number.parseInt(params.page ?? '0', 10) || 0);
  const data = await getModerationReports({ status, targetType, page }).catch(() => null);
  const query = (next: { status?: string; targetType?: string; page?: number }) => {
    const values = new URLSearchParams();
    if (next.status) values.set('status', next.status);
    if (next.targetType) values.set('targetType', next.targetType);
    if (next.page) values.set('page', String(next.page));
    return `/moderation${values.size ? `?${values}` : ''}`;
  };
  return <div className="mx-auto max-w-[1500px]"><header className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-red-50 text-red-700"><Flag size={20} /></span><div><p className="text-sm font-medium text-red-700">신뢰 및 안전</p><h1 className="mt-1 text-2xl font-bold text-slate-950">신고 관리</h1><p className="mt-2 text-sm text-slate-600">AI 답변과 QT 사용자 콘텐츠를 검토하고 필요한 경우 전체 노출을 중단합니다.</p></div></header><div className="mb-5 flex flex-wrap gap-2"><FilterLink active={!status} href={query({ targetType })}>전체 상태</FilterLink><FilterLink active={status === 'OPEN'} href={query({ status: 'OPEN', targetType })}>대기</FilterLink><FilterLink active={status === 'RESOLVED'} href={query({ status: 'RESOLVED', targetType })}>조치 완료</FilterLink><FilterLink active={status === 'DISMISSED'} href={query({ status: 'DISMISSED', targetType })}>기각</FilterLink><span className="mx-1 w-px bg-slate-200" /><FilterLink active={!targetType} href={query({ status })}>모든 대상</FilterLink><FilterLink active={targetType === 'AI_ANSWER'} href={query({ status, targetType: 'AI_ANSWER' })}>AI 답변</FilterLink><FilterLink active={targetType === 'QUIET_TIME_ANSWER'} href={query({ status, targetType: 'QUIET_TIME_ANSWER' })}>QT 답변</FilterLink></div>{data ? <><ModerationOperations data={data} />{data.totalPages > 1 ? <nav aria-label="신고 페이지 이동" className="mt-4 flex justify-end gap-2"><PageLink disabled={data.page === 0} href={query({ status, targetType, page: data.page - 1 })}>이전</PageLink><PageLink disabled={data.page + 1 >= data.totalPages} href={query({ status, targetType, page: data.page + 1 })}>다음</PageLink></nav> : null}</> : <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">신고 대기열을 불러오지 못했습니다. 백엔드 연결과 관리자 권한을 확인해 주세요.</div>}</div>;
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: string }) { return <Link href={href} className={`flex h-9 items-center border px-3 text-sm font-semibold ${active ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-600'}`}>{children}</Link>; }
function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: string }) { return disabled ? <span className="flex h-9 items-center border border-slate-200 px-3 text-sm text-slate-300">{children}</span> : <Link href={href} className="flex h-9 items-center border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">{children}</Link>; }
