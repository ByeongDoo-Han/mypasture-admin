import type { DailyWordAdmin } from './dailyWordAdmin';

const TOPICS: Record<string, string> = { HOPE: '소망', GRATITUDE: '감사', LOVE: '사랑', PEACE: '평안', JOY: '기쁨' };
const PASSAGES: Record<string, string> = { TEACHING: '가르침', POETRY: '시·지혜', NARRATIVE: '이야기', LAW: '율법', GENEALOGY: '족보' };
/** 자동 게시를 관리자 검수로 표시하지 않고 범위와 운영 출처를 구분합니다. */
export function dailyWordDisplay(word: DailyWordAdmin) {
  const end = word.endVerse != null && Number.isInteger(word.endVerse) && word.endVerse > word.verse ? word.endVerse : word.verse;
  const range = end > word.verse ? `${word.verse}–${end}` : String(word.verse);
  const automatic = word.source === 'CURATED' && Boolean(word.readingMode);
  const mode = word.readingMode === 'CONTINUOUS' ? '성경 함께 읽기' : word.readingMode === 'THEMED' ? '요일별 말씀' : '';
  const topics = word.readingMode === 'CONTINUOUS' ? '' : [...new Set(word.topics ?? [])].map(topic => TOPICS[topic]).filter(Boolean).join(' · ');
  return {
    reference: `${word.bookName} ${word.chapter}:${range}`,
    text: word.passageText ?? word.verseText,
    automatic,
    source: automatic ? '자동 본문' : word.source === 'MANUAL' ? '수동 복구' : word.source === 'AI' ? 'AI 초안' : '선정 본문',
    metadata: [mode, topics, word.passageType ? PASSAGES[word.passageType] : ''].filter(Boolean).join(' · '),
    review: word.reviewedAt ? '관리자 검수 기록 있음' : automatic ? '일일 관리자 검수 없음' : '관리자 검수 기록 없음',
  };
}
