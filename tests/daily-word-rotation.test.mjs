import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dailyWordMetadataSchema } from '../src/features/daily-word/dailyWordMetadata.ts';
import { dailyWordDisplay } from '../src/features/daily-word/dailyWordDisplay.ts';

const legacy={bookName:'시편',chapter:23,verse:1,verseText:'여호와는 나의 목자시니',source:'AI',reviewedAt:null};

test('old admin response with no rotation metadata still parses',()=>{
  assert.deepEqual(dailyWordMetadataSchema.parse({}),{});
  assert.equal(dailyWordDisplay(legacy).reference,'시편 23:1');assert.equal(dailyWordDisplay(legacy).text,legacy.verseText);assert.equal(dailyWordDisplay(legacy).automatic,false);
});
test('all supported topic and passage metadata parses while malformed values are rejected',()=>{
  assert.equal(dailyWordMetadataSchema.parse({topics:['HOPE','GRATITUDE','LOVE','PEACE','JOY'],readingMode:'THEMED',passageType:'LAW',endVerse:3,passageText:'1 原文\n2 原文\n3 原文'}).topics.length,5);
  for(const value of [{topics:['INVALID']},{endVerse:0},{endVerse:1.5},{readingMode:'AI'},{passageType:'OTHER'}])assert.equal(dailyWordMetadataSchema.safeParse(value).success,false);
  assert.equal(dailyWordMetadataSchema.safeParse({readingMode:null,passageType:null,endVerse:null,passageText:null}).success,true);
});
test('automatic curated range is not claimed as administrator reviewed',()=>{
  const display=dailyWordDisplay({...legacy,source:'CURATED',readingMode:'THEMED',topics:['HOPE'],endVerse:2,passageType:'POETRY',passageText:'1 原文\n2 原文'});
  assert.equal(display.automatic,true);assert.equal(display.source,'자동 본문');assert.equal(display.metadata,'요일별 말씀 · 소망 · 시·지혜');assert.equal(display.reference,'시편 23:1–2');assert.equal(display.review,'일일 관리자 검수 없음');assert.equal(display.text,'1 原文\n2 原文');
});
test('continuous untagged reading preserves original paragraph and genre',()=>{
  const display=dailyWordDisplay({...legacy,source:'CURATED',readingMode:'CONTINUOUS',topics:[],endVerse:10,passageType:'GENEALOGY',passageText:'1 첫 절\n2 다음 절'});
  assert.equal(display.metadata,'성경 함께 읽기 · 족보');assert.equal(display.text,'1 첫 절\n2 다음 절');
});
test('manual and legacy curated sources never imply automated publication or fabricated review',()=>{
  assert.equal(dailyWordDisplay({...legacy,source:'MANUAL'}).source,'수동 복구');assert.equal(dailyWordDisplay({...legacy,source:'MANUAL'}).automatic,false);
  assert.equal(dailyWordDisplay({...legacy,source:'CURATED'}).automatic,false);
  assert.equal(dailyWordDisplay({...legacy,reviewedAt:'2026-10-09T00:00:00Z'}).review,'관리자 검수 기록 있음');
});
