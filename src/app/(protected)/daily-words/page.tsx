import { CalendarCheck } from 'lucide-react';
import { DailyWordOperations } from '../../../features/daily-word/DailyWordOperations';
import { getDailyWordOperations } from '../../../features/daily-word/dailyWordAdmin';

/** 오늘의 말씀 자동 게시 상태와 예외 복구를 운영하는 관리자 페이지입니다. */
export default async function DailyWordsPage() {
  const operations = await getDailyWordOperations().catch(() => null);
  return <div className="mx-auto max-w-7xl"><header className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800"><CalendarCheck size={20} /></span><div><p className="text-sm font-medium text-emerald-700">콘텐츠 운영</p><h1 className="mt-1 text-2xl font-bold text-slate-950">오늘의 말씀</h1><p className="mt-2 text-sm text-slate-600">요일별 선정 본문은 자동 게시됩니다. 게시 상태와 예외 초안, 운영 사건을 확인하고 필요한 날짜만 복구합니다.</p></div></header>{operations ? <DailyWordOperations {...operations} /> : <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">운영 데이터를 불러오지 못했습니다. 백엔드 연결과 관리자 권한을 확인해 주세요.<a href="/daily-words" className="mt-3 block font-semibold underline">다시 불러오기</a></div>}</div>;
}
