import Link from 'next/link';
import { ArrowLeft, CalendarClock, MessageSquareText, QrCode, UsersRound } from 'lucide-react';
import { QuietTimeAdminActions } from '../../../../features/quiet-time/QuietTimeAdminActions';
import { ScopeBadge, StatusBadge } from '../../../../features/quiet-time/QuietTimeStatusBadge';
import { formatDateTime, formatNumber } from '../../../../lib/format';
import { getQuietTimeSession } from '../../../../features/quiet-time/quietTimeAdmin';

/** QT 세션 운영 정보, QR 상태와 관리자 감사 이력을 표시합니다. */
export default async function QuietTimeSessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getQuietTimeSession(sessionId).catch(() => null);
  if (!session) return <div role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800">세션 정보를 불러오지 못했습니다.</div>;
  const { summary } = session;
  const qrRevocable = session.qrStatus === 'OPEN' || session.qrStatus === 'SCHEDULED';

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/quiet-time" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"><ArrowLeft size={16} />세션 목록</Link>
      <header className="mt-5 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center gap-2"><ScopeBadge scope={summary.scope} /><StatusBadge status={summary.status} /></div>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">{summary.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{summary.pastureName ?? summary.managerDisplayName} · {summary.passageReference}</p>
      </header>

      <div className="grid gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <section className="grid gap-4 border-b border-slate-200 pb-7 sm:grid-cols-2 xl:grid-cols-4">
            <Info icon={<CalendarClock size={19} />} label="시작" value={formatDateTime(summary.meetingStartsAt)} />
            <Info icon={<UsersRound size={19} />} label="참여" value={`${formatNumber(summary.participantCount)}명`} />
            <Info icon={<MessageSquareText size={19} />} label="답변" value={`${formatNumber(summary.answerCount)}건`} />
            <Info icon={<QrCode size={19} />} label="QR 상태" value={qrLabel(session.qrStatus)} />
          </section>
          <section>
            <h2 className="text-base font-semibold text-slate-950">최근 관리자 조치</h2>
            <div className="mt-4 overflow-x-auto border-y border-slate-200 bg-white">
              <table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">작업</th><th className="px-3 py-3 font-medium">사유</th><th className="px-3 py-3 font-medium">세부 정보</th><th className="px-4 py-3 font-medium">시각</th></tr></thead><tbody className="divide-y divide-slate-100">
                {session.recentActions.map((action) => <tr key={action.id}><td className="px-4 py-4 font-medium text-slate-800">{actionLabel(action.action)}</td><td className="max-w-xs px-3 py-4 text-slate-700">{action.reason}</td><td className="px-3 py-4 font-mono text-xs text-slate-500">{action.details}</td><td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatDateTime(action.createdAt)}</td></tr>)}
                {session.recentActions.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">관리자 조치 이력이 없습니다.</td></tr> : null}
              </tbody></table>
            </div>
          </section>
        </div>
        <aside className="border-l-0 border-slate-200 lg:border-l lg:pl-7">
          <h2 className="text-base font-semibold text-slate-950">본문과 QR</h2>
          <dl className="mt-4 space-y-4 text-sm"><div><dt className="text-xs text-slate-500">본문 제목</dt><dd className="mt-1 font-medium text-slate-800">{session.passageTitle}</dd></div><div><dt className="text-xs text-slate-500">QR 만료</dt><dd className="mt-1 text-slate-700">{session.qrExpiresAt ? formatDateTime(session.qrExpiresAt) : '발급 이력 없음'}</dd></div><div><dt className="text-xs text-slate-500">세션 ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-600">{summary.id}</dd></div></dl>
          <div className="mt-7"><QuietTimeAdminActions sessionId={summary.id} sessionClosed={summary.status === 'CLOSED'} qrRevocable={qrRevocable} /></div>
        </aside>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex gap-3 text-slate-700"><span className="mt-0.5 text-emerald-700">{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div></div>; }
function qrLabel(status: string | null): string { return status ? { SCHEDULED: '대기', OPEN: '사용 가능', EXPIRED: '만료', REVOKED: '폐기', CLOSED: '종료' }[status] ?? status : '발급 이력 없음'; }
function actionLabel(action: string): string { return action === 'QUIET_TIME_FORCE_CLOSED' ? '강제 종료' : 'QR 폐기'; }
