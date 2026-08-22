export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

export function scopeLabel(scope: 'PASTURE' | 'STANDALONE'): string {
  return scope === 'PASTURE' ? '고정 목장' : '일회성';
}

export function statusLabel(status: 'DRAFT' | 'OPEN' | 'CLOSED'): string {
  return { DRAFT: '준비', OPEN: '진행 중', CLOSED: '종료' }[status];
}
