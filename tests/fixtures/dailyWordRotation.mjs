/** 관리자 SSR 화면 검사용 공개 문구 fixture이며 운영 서버나 개인 데이터에 접근하지 않습니다. */
let unavailable = false;
const verseText = '여호와는 나의 목자시니 내게 부족함이 없으리로다';
const passageText = `1 ${verseText}\n2 그가 나를 푸른 초장에 누이시며 쉴만한 물 가으로 인도하시는도다\n3 내 영혼을 소생시키시고 자기 이름을 위하여 의의 길로 인도하시는도다`;
const base = { verseId:1,version:'KOR1910',bookCode:'PSA',bookName:'시편',chapter:23,verse:1,verseText,meditation:'본문의 흐름을 함께 읽어 보세요.',actionQuestion:'오늘 마음에 머무는 말씀은 무엇인가요?',source:'CURATED',status:'PUBLISHED',contentRevision:1,model:null,promptVersion:null,retrievalStrategy:null,embeddingTokens:0,promptTokens:0,completionTokens:0,estimatedCostUsd:0,reviewedBy:null,reviewedAt:null,rejectionReason:null,generatedAt:null,publishedAt:'2026-10-09T00:00:00+09:00',updatedAt:'2026-10-09T00:00:00+09:00' };
const words = [
  {...base,id:'10000000-0000-4000-8000-000000000001',date:'2026-10-09',endVerse:3,topics:['HOPE'],readingMode:'THEMED',passageType:'POETRY',passageText},
  {...base,id:'10000000-0000-4000-8000-000000000002',date:'2026-10-10',endVerse:3,topics:[],readingMode:'CONTINUOUS',passageType:'NARRATIVE',passageText},
  {...base,id:'10000000-0000-4000-8000-000000000003',date:'2026-10-08',source:'AI',status:'DRAFT',publishedAt:null,model:'fixture-only'},
];
const summary = {from:'2026-10-08',to:'2026-10-10',generatedAt:'2026-10-09T00:00:00+09:00',today:{date:'2026-10-09',status:'PUBLISHED',publishedAt:base.publishedAt},tomorrow:{date:'2026-10-10',status:'PUBLISHED',publishedAt:base.publishedAt},content:{draft:1,published:2,rejected:0,missing:0,datesNeedingAttention:[]},jobs:{pending:0,processing:0,completed:0,failed:0,cancelled:0,oldestActiveCreatedAt:null},usage:{embeddingTokens:0,promptTokens:0,completionTokens:0,estimatedCostUsd:0}};
const email = {from:'2026-10-01T00:00:00+09:00',to:'2026-10-11T00:00:00+09:00',generatedAt:base.updatedAt,summary:{pending:0,processing:0,retryWait:0,sent:0,dead:0},deliveries:[],page:0,size:20,totalElements:0,totalPages:0,hasNext:false};
export function replyDailyWordFixture(req, reply) {
  if(req.method!=='GET')return false;
  const path=new URL(req.url,'http://127.0.0.1:4181');
  if(path.pathname==='/__daily-word-fixture'){unavailable=path.searchParams.get('unavailable')==='true';reply(200,{ready:true});return true;}
  if(!path.pathname.startsWith('/api/v1/admin/daily-words'))return false;
  if(req.headers.authorization!=='Bearer test-access-token'){reply(401,{});return true;}
  if(unavailable){reply(503,{message:'fixture unavailable'});return true;}
  if(path.pathname==='/api/v1/admin/daily-words')reply(200,words);
  else if(path.pathname.endsWith('/operations-summary'))reply(200,summary);
  else if(path.pathname.endsWith('/incident-email-deliveries'))reply(200,email);
  else if(path.pathname.endsWith('/generation-jobs')||path.pathname.endsWith('/incidents'))reply(200,[]);
  else reply(404,{});
  return true;
}
