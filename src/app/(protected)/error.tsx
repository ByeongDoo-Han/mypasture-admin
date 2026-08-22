'use client';

import { RotateCcw } from 'lucide-react';

/** 예기치 않은 운영 화면 오류를 복구 가능한 상태로 표시합니다. */
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl border-l-4 border-red-600 bg-red-50 px-5 py-4">
      <p className="font-semibold text-red-900">운영 화면을 불러오지 못했습니다.</p>
      <button type="button" onClick={reset} className="mt-3 flex h-9 items-center gap-2 rounded-md border border-red-300 bg-white px-3 text-sm font-medium text-red-800"><RotateCcw size={15} />다시 시도</button>
    </div>
  );
}
