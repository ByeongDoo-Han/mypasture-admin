import { scopeLabel, statusLabel } from '../../lib/format';
import type { QuietTimeScope, QuietTimeStatus } from './quietTimeAdmin';

/** QT 범위와 상태를 표에서 빠르게 구분할 수 있는 작은 상태 표시입니다. */
export function ScopeBadge({ scope }: { scope: QuietTimeScope }) {
  const color = scope === 'PASTURE' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800';
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${color}`}>{scopeLabel(scope)}</span>;
}

export function StatusBadge({ status }: { status: QuietTimeStatus }) {
  const color = status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : status === 'CLOSED' ? 'bg-slate-100 text-slate-600' : 'bg-violet-50 text-violet-700';
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${color}`}>{statusLabel(status)}</span>;
}
