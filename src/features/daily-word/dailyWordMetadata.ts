import { z } from 'zod';

/** 구버전 게시본은 추가 필드가 없어도 조회할 수 있습니다. */
export const dailyWordMetadataSchema = z.object({
  endVerse: z.number().int().positive().nullable().optional(),
  topics: z.array(z.enum(['HOPE', 'GRATITUDE', 'LOVE', 'PEACE', 'JOY'])).optional(),
  readingMode: z.enum(['THEMED', 'CONTINUOUS']).nullable().optional(),
  passageType: z.enum(['TEACHING', 'POETRY', 'NARRATIVE', 'LAW', 'GENEALOGY']).nullable().optional(),
  passageText: z.string().nullable().optional(),
});
