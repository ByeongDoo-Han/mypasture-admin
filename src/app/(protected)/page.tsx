import Link from 'next/link';
import { ArrowRight, MessageSquareText, QrCode, UsersRound } from 'lucide-react';
import { formatNumber } from '../../lib/format';
import { getQuietTimeStatistics } from '../../features/quiet-time/quietTimeAdmin';

/** 실제 QT 운영 통계를 요약하고 상세 운영 화면으로 연결하는 관리자 대시보드입니다. */
export default async function AdminDashboardPage() {
  const statistics = await getQuietTimeStatistics().catch(() => null);
  const metrics = statistics ? [
    { label: '전체 QT', value: statistics.totalSessions, tone: 'text-slate-950' },
    { label: '진행 중', value: statistics.openSessions, tone: 'text-emerald-700' },
    { label: '고정 목장', value: statistics.pastureSessions, tone: 'text-blue-700' },
    { label: '일회성', value: statistics.standaloneSessions, tone: 'text-amber-700' },
  ] : [];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-7">
        <p className="text-sm font-medium text-emerald-700">운영 현황</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">QT 모임 대시보드</h1>
        <p className="mt-2 text-sm text-slate-600">최근 30일 기준 세션과 참여 흐름입니다.</p>
      </header>

      {statistics ? (
        <>
          <section aria-label="QT 핵심 지표" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">{metric.label}</p>
                <p className={`mt-2 text-2xl font-bold ${metric.tone}`}>{formatNumber(metric.value)}</p>
              </article>
            ))}
          </section>
          <section className="mt-6 grid gap-6 border-y border-slate-200 py-6 md:grid-cols-3">
            <div className="flex items-center gap-3"><UsersRound className="text-blue-700" size={20} /><div><p className="text-xs text-slate-500">참여 기록</p><p className="font-semibold">{formatNumber(statistics.participants)}건</p></div></div>
            <div className="flex items-center gap-3"><MessageSquareText className="text-emerald-700" size={20} /><div><p className="text-xs text-slate-500">질문 답변</p><p className="font-semibold">{formatNumber(statistics.answers)}건</p></div></div>
            <div className="flex items-center gap-3"><QrCode className="text-amber-700" size={20} /><div><p className="text-xs text-slate-500">종료된 모임</p><p className="font-semibold">{formatNumber(statistics.closedSessions)}건</p></div></div>
          </section>
        </>
      ) : (
        <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">운영 통계를 불러오지 못했습니다. 백엔드 연결 상태를 확인해 주세요.</div>
      )}

      <section className="mt-8 flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div><h2 className="font-semibold text-slate-950">QT 모임 운영</h2><p className="mt-1 text-sm text-slate-600">세션 상태, 참여 규모와 관리자 조치 이력을 확인합니다.</p></div>
        <Link href="/quiet-time" className="flex h-10 shrink-0 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">목록 보기<ArrowRight aria-hidden="true" size={16} /></Link>
      </section>
    </div>
  );
}
