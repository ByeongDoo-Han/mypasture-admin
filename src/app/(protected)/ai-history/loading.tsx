/** AI 목자 기록 페이지를 불러오는 동안 표시할 상태입니다. */
export default function AiHistoryLoading() {
  return <div className="mx-auto max-w-6xl" role="status" aria-live="polite">
    <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200" />
    <div className="space-y-3">
      {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-md border border-slate-200 bg-slate-50" />)}
    </div>
    <span className="sr-only">AI 목자 질문 기록을 불러오는 중입니다.</span>
  </div>;
}
