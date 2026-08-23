import { CalendarCheck } from 'lucide-react';
import { DailyWordOperations } from '../../../features/daily-word/DailyWordOperations';
import { getDailyWordOperations } from '../../../features/daily-word/dailyWordAdmin';

/** 오늘의 말씀 AI 초안, 검수 상태와 생성 작업을 운영하는 관리자 페이지입니다. */
export default async function DailyWordsPage() {
  const operations = await getDailyWordOperations().catch(() => null);
  return <div className="mx-auto max-w-7xl"><header className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800"><CalendarCheck size={20} /></span><div><p className="text-sm font-medium text-emerald-700">콘텐츠 운영</p><h1 className="mt-1 text-2xl font-bold text-slate-950">오늘의 말씀</h1><p className="mt-2 text-sm text-slate-600">AI 초안은 성경 원문 확인과 관리자 게시 후에만 앱과 알림에 노출됩니다.</p></div></header>{operations ? <DailyWordOperations {...operations} /> : <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">운영 데이터를 불러오지 못했습니다. 백엔드 연결과 관리자 권한을 확인해 주세요.</div>}</div>;
}
