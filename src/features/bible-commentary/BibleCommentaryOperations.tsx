'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, BookCopy, Check, FileCheck2, History, LoaderCircle, Plus, RefreshCw, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import type { BibleBook, BibleCommentaryAdmin, BibleCommentaryJob } from './bibleCommentaryAdmin';

type Evidence = {
  id: string; version: string; bookCode: string; chapter: number | null; evidenceType: 'HISTORICAL' | 'LITERARY' | 'THEOLOGICAL';
  title: string; content: string; sourceName: string; sourceUrl: string | null; licenseNote: string;
  status: 'DRAFT' | 'APPROVED' | 'RETIRED'; createdBy: string; approvedBy: string | null; approvedAt: string | null; createdAt: string; updatedAt: string;
};

type ReviewEvent = { id: number; commentaryId: string; previousCommentaryId: string | null; action: 'EDITED' | 'PUBLISHED' | 'REJECTED'; reviewerId: string; notes: string; createdAt: string };

/** 권·장을 중심으로 근거 승인, 생성, 자동 평가와 사람 검수를 연결하는 운영 화면입니다. */
export function BibleCommentaryOperations({ commentaries, jobs, books }: { commentaries: BibleCommentaryAdmin[]; jobs: BibleCommentaryJob[]; books: BibleBook[] }) {
  const router = useRouter();
  const [bookCode, setBookCode] = useState(books[0]?.code ?? 'GEN');
  const book = books.find((item) => item.code === bookCode) ?? books[0];
  const [chapter, setChapter] = useState(1);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const selected = useMemo(() => commentaries.filter((item) => item.commentary.bookCode === bookCode && item.commentary.chapter === chapter).sort((a, b) => b.commentary.revision - a.commentary.revision), [commentaries, bookCode, chapter]);
  const selectedJobs = jobs.filter((job) => job.bookCode === bookCode).slice(0, 20);

  useEffect(() => { void loadEvidence(); }, [bookCode, chapter]);

  async function loadEvidence() {
    setEvidenceLoading(true);
    const query = new URLSearchParams({ version: 'KOR1910', bookCode, chapter: String(chapter) });
    const response = await fetch(`/api/admin/bible-commentaries/evidence?${query}`).catch(() => null);
    setEvidenceLoading(false);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '근거 자료를 불러오지 못했습니다.');
    setEvidence(await response.json() as Evidence[]);
  }

  async function queue(scope: 'chapter' | 'book') {
    const target = scope === 'chapter' ? `${book?.name} ${chapter}장` : `${book?.name} 전체 미게시 장`;
    if (!window.confirm(`${target} 해설 생성을 등록하시겠습니까?`)) return;
    setPending(`queue:${scope}`); setMessage(null);
    const response = await fetch(`/api/admin/bible-commentaries/generation-jobs${scope === 'book' ? '/books' : ''}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scope === 'book' ? { version: 'KOR1910', bookCode, includePublished: false } : { version: 'KOR1910', bookCode, chapter }),
    }).catch(() => null);
    setPending(null);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '백엔드에 연결할 수 없습니다.');
    if (scope === 'book') {
      const result = await response.json() as { queuedChapters: number[]; skippedChapters: number[]; unavailableChapters: number[] };
      setMessage(`등록 ${result.queuedChapters.length}장 · 건너뜀 ${result.skippedChapters.length}장 · 본문 없음 ${result.unavailableChapters.length}장`);
    } else setMessage('생성 작업을 등록했습니다.');
    router.refresh();
  }

  return <div className="space-y-8">
    <section className="border-y border-slate-200 bg-white px-4 py-5 sm:px-6">
      <div className="grid items-end gap-4 md:grid-cols-[minmax(220px,1fr)_140px_auto_auto]">
        <label className="text-sm font-medium text-slate-700">성경<select value={bookCode} onChange={(event) => { setBookCode(event.target.value); setChapter(1); }} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{books.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">장<input type="number" min={1} max={book?.chapterCount ?? 1} value={chapter} onChange={(event) => setChapter(Math.min(book?.chapterCount ?? 1, Math.max(1, Number(event.target.value))))} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
        <Action disabled={pending !== null} onClick={() => void queue('chapter')} icon={pending === 'queue:chapter' ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}>이 장 생성</Action>
        <Action disabled={pending !== null} onClick={() => void queue('book')} icon={pending === 'queue:book' ? <LoaderCircle size={16} className="animate-spin" /> : <BookCopy size={16} />}>책 전체 생성</Action>
      </div>
      {message ? <p role="status" className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
    </section>

    <EvidenceOperations bookCode={bookCode} chapter={chapter} evidence={evidence} loading={evidenceLoading} onChanged={loadEvidence} />

    <section>
      <div className="mb-3 flex items-center gap-2"><History size={18} className="text-slate-500" /><h2 className="text-base font-semibold">최근 생성 작업</h2></div>
      <div className="overflow-x-auto border-y border-slate-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><Th>장</Th><Th>상태</Th><Th>시도</Th><Th>결과</Th><Th>갱신</Th></tr></thead><tbody className="divide-y divide-slate-100">{selectedJobs.map((job) => <tr key={job.id}><Td>{job.chapter}장</Td><Td><Status value={job.status} /></Td><Td>{job.attemptCount}</Td><Td>{job.errorMessage ?? (job.commentaryId ? '평가 결과 저장 완료' : '-')}</Td><Td>{formatDate(job.updatedAt)}</Td></tr>)}{selectedJobs.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">이 책의 생성 작업이 없습니다.</td></tr> : null}</tbody></table></div>
    </section>

    <section className="space-y-4">
      <div><h2 className="text-base font-semibold">{book?.name} {chapter}장 검수</h2><p className="mt-1 text-xs text-slate-500">최신 revision부터 표시됩니다.</p></div>
      {selected.map((commentary, index) => <CommentaryEditor key={commentary.commentary.id} commentary={commentary} primary={index === 0} onChanged={() => router.refresh()} />)}
      {selected.length === 0 ? <div className="border-y border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">생성된 해설이 없습니다.</div> : null}
    </section>
  </div>;
}

function EvidenceOperations({ bookCode, chapter, evidence, loading, onChanged }: { bookCode: string; chapter: number; evidence: Evidence[]; loading: boolean; onChanged: () => Promise<void> }) {
  const [type, setType] = useState<Evidence['evidenceType']>('LITERARY');
  const [title, setTitle] = useState(''); const [content, setContent] = useState('');
  const [sourceName, setSourceName] = useState('My Pasture 내부 검수 메모'); const [sourceUrl, setSourceUrl] = useState('');
  const [licenseNote, setLicenseNote] = useState('서비스 내부 작성 및 사용 승인'); const [bookLevel, setBookLevel] = useState(false);
  const [pending, setPending] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);

  async function create() {
    setPending('create'); setMessage(null);
    const response = await fetch('/api/admin/bible-commentaries/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: 'KOR1910', bookCode, chapter: bookLevel ? null : chapter, evidenceType: type, title, content, sourceName, sourceUrl: sourceUrl.trim() || null, licenseNote }) }).catch(() => null);
    setPending(null);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '백엔드에 연결할 수 없습니다.');
    setTitle(''); setContent(''); setSourceUrl(''); setMessage('근거 초안을 등록했습니다. 승인 전에는 AI 입력에 사용되지 않습니다.'); await onChanged();
  }

  async function change(item: Evidence, action: 'approve' | 'retire') {
    if (!window.confirm(`“${item.title}” 근거를 ${action === 'approve' ? '승인' : '폐기'}하시겠습니까?`)) return;
    setPending(item.id); setMessage(null);
    const response = await fetch(`/api/admin/bible-commentaries/evidence/${item.id}/${action}`, { method: 'POST' }).catch(() => null);
    setPending(null);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '백엔드에 연결할 수 없습니다.');
    setMessage(action === 'approve' ? '근거를 승인했습니다.' : '근거를 생성 입력에서 제외했습니다.'); await onChanged();
  }

  return <section aria-labelledby="commentary-evidence">
    <div className="mb-3 flex items-center gap-2"><ShieldCheck size={18} className="text-slate-500" /><h2 id="commentary-evidence" className="text-base font-semibold">승인 근거</h2>{loading ? <LoaderCircle size={15} className="animate-spin text-slate-400" /> : null}</div>
    <div className="grid gap-3 border-y border-slate-200 bg-white px-4 py-5 md:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-medium text-slate-700">유형<select value={type} onChange={(event) => setType(event.target.value as Evidence['evidenceType'])} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="HISTORICAL">역사</option><option value="LITERARY">문학</option><option value="THEOLOGICAL">신학</option></select></label>
      <label className="text-sm font-medium text-slate-700 lg:col-span-2">제목<input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="flex h-10 items-center gap-2 self-end text-sm font-medium text-slate-700"><input type="checkbox" checked={bookLevel} onChange={(event) => setBookLevel(event.target.checked)} className="h-4 w-4 accent-emerald-700" />책 전체에 적용</label>
      <label className="text-sm font-medium text-slate-700 md:col-span-2 lg:col-span-4">근거 내용<textarea value={content} maxLength={4000} rows={4} onChange={(event) => setContent(event.target.value)} className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 leading-6" /></label>
      <label className="text-sm font-medium text-slate-700">출처명<input value={sourceName} maxLength={240} onChange={(event) => setSourceName(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">출처 HTTPS 주소<input type="url" value={sourceUrl} maxLength={1000} onChange={(event) => setSourceUrl(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700 lg:col-span-2">사용권 메모<input value={licenseNote} maxLength={500} onChange={(event) => setLicenseNote(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <button type="button" disabled={pending !== null || title.trim().length < 2 || content.trim().length < 20} onClick={() => void create()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50 md:w-fit">{pending === 'create' ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}근거 등록</button>
    </div>
    <div className="mt-4 divide-y divide-slate-100 border-y border-slate-200 bg-white">{evidence.map((item) => <div key={item.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[140px_minmax(0,1fr)_auto]"><div><Status value={item.status} /><p className="mt-2 text-xs text-slate-500">{item.chapter ? `${item.chapter}장` : '책 전체'} · {evidenceType(item.evidenceType)}</p></div><div className="min-w-0"><p className="font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-sm leading-6 text-slate-700">{item.content}</p><p className="mt-2 text-xs text-slate-500">{item.sourceName} · {item.licenseNote}</p></div><div className="flex items-start gap-2">{item.status === 'DRAFT' ? <Action disabled={pending !== null} onClick={() => void change(item, 'approve')} icon={<Check size={15} />}>승인</Action> : null}{item.status !== 'RETIRED' ? <button type="button" aria-label="근거 폐기" title="근거 폐기" disabled={pending !== null} onClick={() => void change(item, 'retire')} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 disabled:opacity-50"><Trash2 size={16} /></button> : null}</div></div>)}{evidence.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-500">등록된 근거가 없습니다.</p> : null}</div>
    {message ? <p role="status" className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
  </section>;
}

function CommentaryEditor({ commentary, primary, onChanged }: { commentary: BibleCommentaryAdmin; primary: boolean; onChanged: () => void }) {
  const source = commentary.commentary;
  const [summary, setSummary] = useState(source.summary); const [context, setContext] = useState(source.historicalContext);
  const [sections, setSections] = useState(source.sections); const [references, setReferences] = useState(source.crossReferences);
  const [themes, setThemes] = useState(source.keyThemes.join('\n')); const [questions, setQuestions] = useState(source.reflectionQuestions.join('\n')); const [cautions, setCautions] = useState(source.cautions.join('\n'));
  const [notes, setNotes] = useState('성경 본문과 승인 근거를 직접 검수했습니다.'); const [quality, setQuality] = useState(90);
  const [pending, setPending] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null); const [reviews, setReviews] = useState<ReviewEvent[]>([]);
  const editable = primary && (commentary.status === 'DRAFT' || commentary.status === 'REJECTED');

  useEffect(() => { setSummary(source.summary); setContext(source.historicalContext); setSections(source.sections); setReferences(source.crossReferences); setThemes(source.keyThemes.join('\n')); setQuestions(source.reflectionQuestions.join('\n')); setCautions(source.cautions.join('\n')); void loadReviews(); }, [source.id]);

  async function loadReviews() { const response = await fetch(`/api/admin/bible-commentaries/${source.id}/reviews`).catch(() => null); if (response?.ok) setReviews(await response.json() as ReviewEvent[]); }
  async function act(action: 'update' | 'publish' | 'reject') {
    if (notes.trim().length < 5) return setMessage('검수 사유를 5자 이상 입력해 주세요.');
    if (action !== 'update' && !window.confirm(`${source.bookName} ${source.chapter}장 revision ${source.revision}을 ${action === 'publish' ? '게시' : '반려'}하시겠습니까?`)) return;
    setPending(action); setMessage(null);
    const path = action === 'update' ? source.id : `${source.id}/${action}`;
    const body = action === 'update' ? { summary, historicalContext: context, sections, keyThemes: lines(themes), crossReferences: references, reflectionQuestions: lines(questions), cautions: lines(cautions), reviewNotes: notes.trim() } : action === 'publish' ? { qualityScore: quality, reviewNotes: notes.trim() } : { reviewNotes: notes.trim() };
    const response = await fetch(`/api/admin/bible-commentaries/${path}`, { method: action === 'update' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    setPending(null);
    if (!response?.ok) return setMessage(response ? await errorMessage(response) : '백엔드에 연결할 수 없습니다.');
    setMessage(action === 'update' ? '새 검수 revision을 저장했습니다.' : action === 'publish' ? '게시했습니다.' : '반려했습니다.'); onChanged();
  }

  const risk = commentary.fabricatedScripture || commentary.unsupportedHistoricalClaims || commentary.evaluationStatus === 'FAILED';
  return <article className={`border-y bg-white px-4 py-5 sm:px-6 ${primary ? 'border-emerald-300' : 'border-slate-200 opacity-80'}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-emerald-700">revision {source.revision} · {commentary.model}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{source.bookName} {source.chapter}장</h3></div><div className="flex gap-2"><Status value={commentary.status} /><Status value={commentary.evaluationStatus} /></div></div>
    <EvaluationSummary commentary={commentary} />
    {risk ? <div role="alert" className="mt-4 flex gap-2 border-l-4 border-red-600 bg-red-50 px-3 py-3 text-sm text-red-900"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><div><p className="font-semibold">게시 전 수정이 필요합니다.</p>{commentary.evaluationIssues.map((issue) => <p key={issue} className="mt-1">{issue}</p>)}</div></div> : null}
    <div className="mt-5 grid gap-4 lg:grid-cols-2"><TextArea label="요약" value={summary} onChange={setSummary} disabled={!editable} rows={7} maxLength={2000} /><TextArea label="역사·문학적 배경" value={context} onChange={setContext} disabled={!editable} rows={7} maxLength={3000} /></div>
    <div className="mt-5 space-y-3"><h4 className="text-sm font-semibold text-slate-800">절 구간 해설</h4>{sections.map((section, index) => <div key={`${index}-${section.startVerse}`} className="grid gap-3 border-t border-slate-100 pt-3 lg:grid-cols-[90px_90px_220px_minmax(0,1fr)_40px]"><input aria-label="시작 절" disabled={!editable} type="number" min={1} value={section.startVerse} onChange={(event) => setSections(updateAt(sections, index, { ...section, startVerse: Number(event.target.value) }))} className="h-10 rounded-md border border-slate-300 px-3" /><input aria-label="마지막 절" disabled={!editable} type="number" min={1} value={section.endVerse} onChange={(event) => setSections(updateAt(sections, index, { ...section, endVerse: Number(event.target.value) }))} className="h-10 rounded-md border border-slate-300 px-3" /><input aria-label="구간 제목" disabled={!editable} value={section.title} onChange={(event) => setSections(updateAt(sections, index, { ...section, title: event.target.value }))} className="h-10 rounded-md border border-slate-300 px-3" /><textarea aria-label="구간 해설" disabled={!editable} value={section.explanation} onChange={(event) => setSections(updateAt(sections, index, { ...section, explanation: event.target.value }))} rows={3} className="resize-y rounded-md border border-slate-300 px-3 py-2" />{editable ? <button type="button" aria-label="구간 삭제" title="구간 삭제" onClick={() => setSections(sections.filter((_, itemIndex) => itemIndex !== index))} className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600"><X size={16} /></button> : null}</div>)}{editable ? <Action onClick={() => setSections([...sections, { startVerse: (sections.at(-1)?.endVerse ?? 0) + 1, endVerse: (sections.at(-1)?.endVerse ?? 0) + 1, title: '', explanation: '' }])} icon={<Plus size={15} />}>구간 추가</Action> : null}</div>
    <div className="mt-5 grid gap-4 lg:grid-cols-3"><TextArea label="핵심 주제 · 한 줄에 하나" value={themes} onChange={setThemes} disabled={!editable} rows={5} /><TextArea label="묵상 질문 · 한 줄에 하나" value={questions} onChange={setQuestions} disabled={!editable} rows={5} /><TextArea label="해석상 주의 · 한 줄에 하나" value={cautions} onChange={setCautions} disabled={!editable} rows={5} /></div>
    <div className="mt-5 space-y-3"><h4 className="text-sm font-semibold text-slate-800">교차 참조</h4>{references.map((reference, index) => <div key={`${index}-${reference.bookCode}`} className="grid gap-3 lg:grid-cols-[100px_90px_90px_minmax(0,1fr)_40px]"><input aria-label="성경 코드" disabled={!editable} value={reference.bookCode} onChange={(event) => setReferences(updateAt(references, index, { ...reference, bookCode: event.target.value.toUpperCase() }))} className="h-10 rounded-md border border-slate-300 px-3" /><input aria-label="장" disabled={!editable} type="number" min={1} value={reference.chapter} onChange={(event) => setReferences(updateAt(references, index, { ...reference, chapter: Number(event.target.value) }))} className="h-10 rounded-md border border-slate-300 px-3" /><input aria-label="절" disabled={!editable} type="number" min={1} value={reference.verse} onChange={(event) => setReferences(updateAt(references, index, { ...reference, verse: Number(event.target.value) }))} className="h-10 rounded-md border border-slate-300 px-3" /><input aria-label="연결 이유" disabled={!editable} value={reference.reason} onChange={(event) => setReferences(updateAt(references, index, { ...reference, reason: event.target.value }))} className="h-10 rounded-md border border-slate-300 px-3" />{editable ? <button type="button" aria-label="참조 삭제" title="참조 삭제" onClick={() => setReferences(references.filter((_, itemIndex) => itemIndex !== index))} className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600"><X size={16} /></button> : null}</div>)}{editable ? <Action onClick={() => setReferences([...references, { bookCode: 'GEN', chapter: 1, verse: 1, reason: '' }])} icon={<Plus size={15} />}>참조 추가</Action> : null}</div>
    {editable ? <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-5"><label className="min-w-[280px] flex-1 text-sm font-medium text-slate-700">검수 사유<input value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label><label className="w-28 text-sm font-medium text-slate-700">품질 점수<input type="number" min={1} max={100} value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" /></label><Action disabled={pending !== null} onClick={() => void act('update')} icon={pending === 'update' ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}>새 revision</Action>{commentary.status === 'DRAFT' ? <><Action disabled={pending !== null} onClick={() => void act('reject')} icon={<X size={15} />}>반려</Action><button type="button" disabled={pending !== null} onClick={() => void act('publish')} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"><FileCheck2 size={15} />게시</button></> : null}</div> : null}
    {reviews.length > 0 ? <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-semibold text-slate-600">검수 이력</p>{reviews.map((review) => <p key={review.id} className="mt-2 text-xs text-slate-500">{formatDate(review.createdAt)} · {reviewAction(review.action)} · {review.notes}</p>)}</div> : null}
    {message ? <p role="status" className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
  </article>;
}

function EvaluationSummary({ commentary }: { commentary: BibleCommentaryAdmin }) {
  const metrics = [['본문 충실성', commentary.evaluationGroundingScore], ['역사 근거', commentary.evaluationHistoricalEvidenceScore], ['참조 관련성', commentary.evaluationReferenceRelevanceScore], ['신학적 중립성', commentary.evaluationTheologicalNeutralityScore], ['가독성', commentary.evaluationClarityScore]] as const;
  return <div className="mt-4 grid border-y border-slate-200 bg-slate-50 sm:grid-cols-3 lg:grid-cols-6">{metrics.map(([title, value]) => <div key={title} className="border-b border-slate-200 px-3 py-3 sm:border-r lg:border-b-0"><p className="text-xs text-slate-500">{title}</p><p className={`mt-1 text-lg font-bold ${(value ?? 0) < 4 ? 'text-red-700' : 'text-slate-950'}`}>{value ?? '-'}/5</p></div>)}<div className="px-3 py-3"><p className="text-xs text-slate-500">누적 비용</p><p className="mt-1 text-sm font-bold text-slate-950">${(commentary.estimatedCostUsd + commentary.evaluationCostUsd).toFixed(6)}</p></div></div>;
}

function TextArea({ label, value, onChange, disabled, rows, maxLength }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; rows: number; maxLength?: number }) { return <label className="text-sm font-medium text-slate-700">{label}<textarea disabled={disabled} value={value} rows={rows} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 leading-6 disabled:bg-slate-50" /></label>; }
function Action({ children, icon, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode }) { return <button type="button" {...props} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">{icon}{children}</button>; }
function Status({ value }: { value: string }) { const color = ['PUBLISHED', 'COMPLETED', 'APPROVED', 'PASSED'].includes(value) ? 'bg-emerald-50 text-emerald-800' : ['FAILED', 'REJECTED', 'RETIRED'].includes(value) ? 'bg-red-50 text-red-800' : value === 'SUPERSEDED' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'; return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${color}`}>{statusLabel(value)}</span>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 font-medium">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-3 align-top text-slate-700">{children}</td>; }
function lines(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean); }
function updateAt<T>(items: T[], index: number, value: T) { return items.map((item, itemIndex) => itemIndex === index ? value : item); }
function formatDate(value: string) { return new Date(value).toLocaleString('ko-KR'); }
function evidenceType(value: Evidence['evidenceType']) { return ({ HISTORICAL: '역사', LITERARY: '문학', THEOLOGICAL: '신학' } as const)[value]; }
function reviewAction(value: ReviewEvent['action']) { return ({ EDITED: '수정', PUBLISHED: '게시', REJECTED: '반려' } as const)[value]; }
function statusLabel(value: string) { return ({ DRAFT: '초안', PUBLISHED: '게시', REJECTED: '반려', SUPERSEDED: '이전 revision', PENDING: '대기', PROCESSING: '처리 중', COMPLETED: '완료', FAILED: '실패', APPROVED: '승인', RETIRED: '폐기', PASSED: '평가 통과', NOT_EVALUATED: '미평가', MANUAL_REVIEW: '사람 검수' } as Record<string, string>)[value] ?? value; }
async function errorMessage(response: Response) { const body = await response.json().catch(() => null) as { message?: string } | null; return body?.message ?? '요청을 처리하지 못했습니다.'; }
