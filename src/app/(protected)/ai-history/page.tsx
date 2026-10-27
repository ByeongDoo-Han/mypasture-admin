import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import { AiHistoryReview } from '../../../features/ai-history/AiHistoryReview';
import { getAiHistoryPage } from '../../../features/ai-history/aiHistoryAdmin';

/** 작성자·시간·질문을 목록에서 확인하고 답변은 감사 후 열람하는 화면입니다. */
export default async function AiHistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const raw = (await searchParams).page;
  const parsedPage = Number(raw ?? 0);
  const page = Number.isSafeInteger(parsedPage) && parsedPage >= 0 && parsedPage <= 100_000 ? parsedPage : 0;
  const data = await getAiHistoryPage(page).catch(() => null);

  return <div className="mx-auto max-w-6xl">
    <header className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><MessageSquareText size={20} /></span><div><p className="text-sm font-medium text-emerald-700">AI 목자</p><h1 className="mt-1 text-2xl font-bold text-slate-950">질문·답변 기록</h1><p className="mt-2 text-sm text-slate-600">보유기간 안의 기록입니다. 상세 원문 열람은 목적과 관리자 계정이 기록됩니다.</p></div></header>
    {!data ? <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">AI 목자 기록을 불러오지 못했습니다. 관리자 권한과 백엔드 연결을 확인해 주세요.</div> : <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm"><p className="text-slate-600">총 <strong className="text-slate-950">{data.totalElements.toLocaleString('ko-KR')}</strong>개 질문</p><p className="text-slate-500">{data.page + 1} / {Math.max(data.totalPages, 1)} 페이지</p></div>
      <div className="space-y-3">{data.items.map((item) => <article key={item.turnId} className="rounded-md border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-950">{item.displayName} <span className="text-sm font-normal text-slate-500">{item.email ?? '이메일 없음'}</span></p><p className="mt-1 break-all font-mono text-xs text-slate-400">사용자 ID {item.userId}</p></div><time dateTime={item.createdAt} className="shrink-0 text-xs text-slate-500">질문 {formatDate(item.createdAt)}</time></div>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{item.questionPreview}</p>
        {item.revisionCount > 0 ? <p className="mt-1 text-xs text-slate-500">개선 답변 {item.revisionCount}개</p> : null}
        <AiHistoryReview turnId={item.turnId} />
      </article>)}{data.items.length === 0 ? <div className="rounded-md border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-500">표시할 AI 목자 질문이 없습니다.</div> : null}</div>
      <nav aria-label="AI 기록 페이지 이동" className="mt-5 flex justify-end gap-2"><PageLink href={`/ai-history?page=${page - 1}`} disabled={page === 0}>이전</PageLink><PageLink href={`/ai-history?page=${page + 1}`} disabled={page + 1 >= data.totalPages}>다음</PageLink></nav>
    </>}
  </div>;
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: string }) {
  const classes = 'inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold';
  return disabled ? <span aria-disabled="true" className={`${classes} text-slate-300`}>{children}</span> : <Link href={href} className={`${classes} bg-white text-slate-700 hover:bg-slate-50`}>{children}</Link>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
