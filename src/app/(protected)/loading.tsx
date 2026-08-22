/** 보호된 운영 화면을 서버에서 준비하는 동안 레이아웃 이동 없이 표시하는 로딩 상태입니다. */
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse" aria-label="불러오는 중">
      <div className="h-4 w-20 rounded bg-slate-200" />
      <div className="mt-3 h-8 w-56 rounded bg-slate-200" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 rounded-lg border border-slate-200 bg-white" />)}
      </div>
    </div>
  );
}
