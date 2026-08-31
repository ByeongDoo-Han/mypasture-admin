import { BookOpenText } from 'lucide-react';
import { BibleCommentaryOperations } from '../../../features/bible-commentary/BibleCommentaryOperations';
import { getBibleCommentaryOperations } from '../../../features/bible-commentary/bibleCommentaryAdmin';

/** 장별 성경 해설의 근거, 생성 작업과 게시 revision을 운영하는 관리자 페이지입니다. */
export default async function BibleCommentariesPage() {
  const operations = await getBibleCommentaryOperations().catch(() => null);
  return <div className="mx-auto max-w-7xl">
    <header className="mb-6 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800"><BookOpenText size={20} /></span>
      <div><p className="text-sm font-medium text-emerald-700">콘텐츠 운영</p><h1 className="mt-1 text-2xl font-bold text-slate-950">장별 성경 해설</h1><p className="mt-2 text-sm text-slate-600">승인 근거와 자동 평가를 확인한 revision만 게시합니다.</p></div>
    </header>
    {operations ? <BibleCommentaryOperations {...operations} /> : <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">운영 데이터를 불러오지 못했습니다. 백엔드 배포와 관리자 권한을 확인해 주세요.</div>}
  </div>;
}
