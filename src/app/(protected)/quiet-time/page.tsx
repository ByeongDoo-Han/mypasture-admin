import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { ScopeBadge, StatusBadge } from '../../../features/quiet-time/QuietTimeStatusBadge';
import { formatDateTime, formatNumber } from '../../../lib/format';
import { getQuietTimeSessions } from '../../../features/quiet-time/quietTimeAdmin';

type Query = Record<string, string | string[] | undefined>;

/** 필터와 페이지 탐색을 제공하는 QT 관리자 세션 목록입니다. */
export default async function QuietTimeSessionsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const raw = await searchParams;
  const filters = {
    scope: single(raw.scope), status: single(raw.status), search: single(raw.search), page: single(raw.page) ?? '0',
  };
  const sessions = await getQuietTimeSessions(filters).catch(() => null);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <p className="text-sm font-medium text-emerald-700">QT 모임</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">세션 운영</h1>
      </header>

      <form className="grid gap-3 border-y border-slate-200 bg-white px-4 py-4 sm:grid-cols-[160px_160px_minmax(220px,1fr)_44px]" method="get">
        <select name="scope" defaultValue={filters.scope ?? ''} aria-label="모임 유형" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
          <option value="">모든 유형</option><option value="PASTURE">고정 목장</option><option value="STANDALONE">일회성</option>
        </select>
        <select name="status" defaultValue={filters.status ?? ''} aria-label="진행 상태" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
          <option value="">모든 상태</option><option value="OPEN">진행 중</option><option value="CLOSED">종료</option><option value="DRAFT">준비</option>
        </select>
        <input name="search" defaultValue={filters.search ?? ''} maxLength={100} aria-label="세션 검색" placeholder="제목, 호스트 또는 목장 검색" className="h-10 min-w-0 rounded-md border border-slate-300 px-3 text-sm" />
        <button type="submit" title="검색" aria-label="검색" className="flex h-10 w-11 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800"><Search size={17} /></button>
      </form>

      {!sessions ? (
        <div role="alert" className="mt-6 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">세션 목록을 불러오지 못했습니다. 백엔드 연결 상태를 확인해 주세요.</div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between text-sm"><p className="text-slate-600">총 <strong className="text-slate-950">{formatNumber(sessions.totalElements)}</strong>개</p><p className="text-slate-500">{sessions.page + 1} / {Math.max(sessions.totalPages, 1)} 페이지</p></div>
          <div className="mt-3 overflow-x-auto border-y border-slate-200 bg-white">
            <table className="w-full min-w-[940px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">모임</th><th className="px-3 py-3 font-medium">유형</th><th className="px-3 py-3 font-medium">상태</th><th className="px-3 py-3 font-medium">관리자</th><th className="px-3 py-3 text-right font-medium">참여</th><th className="px-3 py-3 text-right font-medium">답변</th><th className="px-4 py-3 font-medium">시작</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.content.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4"><Link href={`/quiet-time/${session.id}`} className="font-semibold text-slate-950 hover:text-emerald-700">{session.title}</Link><p className="mt-1 text-xs text-slate-500">{session.pastureName ?? session.passageReference}</p></td>
                    <td className="px-3 py-4"><ScopeBadge scope={session.scope} /></td><td className="px-3 py-4"><StatusBadge status={session.status} /></td>
                    <td className="px-3 py-4 text-slate-700">{session.managerDisplayName}</td><td className="px-3 py-4 text-right tabular-nums">{formatNumber(session.participantCount)}</td><td className="px-3 py-4 text-right tabular-nums">{formatNumber(session.answerCount)}</td><td className="px-4 py-4 whitespace-nowrap text-slate-600">{formatDateTime(session.meetingStartsAt)}</td>
                  </tr>
                ))}
                {sessions.content.length === 0 ? <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-500">조건에 맞는 QT 모임이 없습니다.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <nav aria-label="페이지 이동" className="mt-5 flex justify-end gap-2">
            <PageLink disabled={sessions.page === 0} href={pageHref(raw, sessions.page - 1)} label="이전"><ChevronLeft size={16} /></PageLink>
            <PageLink disabled={sessions.page + 1 >= sessions.totalPages} href={pageHref(raw, sessions.page + 1)} label="다음"><ChevronRight size={16} /></PageLink>
          </nav>
        </>
      )}
    </div>
  );
}

function single(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
function pageHref(raw: Query, page: number): string {
  const query = new URLSearchParams();
  for (const key of ['scope', 'status', 'search']) { const value = single(raw[key]); if (value) query.set(key, value); }
  query.set('page', String(Math.max(0, page))); return `/quiet-time?${query}`;
}
function PageLink({ disabled, href, label, children }: { disabled: boolean; href: string; label: string; children: React.ReactNode }) {
  const style = 'flex h-10 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium';
  return disabled ? <span aria-disabled="true" className={`${style} cursor-not-allowed text-slate-300`}>{children}{label}</span> : <Link className={`${style} text-slate-700 hover:bg-slate-50`} href={href}>{children}{label}</Link>;
}
