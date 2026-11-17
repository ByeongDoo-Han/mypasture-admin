import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { replyDailyWordFixture } from '../tests/fixtures/dailyWordRotation.mjs';

/** 브라우저 테스트에서 메일 발송과 운영 API를 대체하는 로컬 전용 서버입니다. */
const challenges = new Map();
const admin = { id: 'f71dd5ce-7e62-4abe-9172-e43c80a76742', email: 'admin@example.test', displayName: '테스트 관리자', role: 'ADMIN' };
const aiTurnId = 'e5f4f12e-315f-4cc9-91a4-182e8c42d619';
const aiUserId = 'a9ac5959-a79c-4ae1-a65a-c68cc8db29ec';
const listItemId = '11111111-1111-4111-8111-111111111111';
const listTime = '2026-11-16T09:00:00Z';
const quietTimeItem = {
  id: listItemId, scope: 'PASTURE', status: 'OPEN', title: '주일 저녁 말씀 나눔',
  pastureName: '함께 걷는 목장', managerDisplayName: '테스트 관리자', passageReference: '이사야 40:31',
  meetingDate: '2026-11-16', meetingStartsAt: listTime, meetingEndsAt: '2026-11-16T10:00:00Z',
  participantCount: 12, answerCount: 8, createdAt: listTime,
};
const notificationItem = {
  id: listItemId, type: 'DAILY_WORD', title: '오늘의 말씀', body: '긴 알림 내용을 확인할 수 있는 테스트 메시지입니다.',
  destinationType: 'TODAY_WORD', publishedAt: listTime, expiresAt: '2026-11-17T09:00:00Z',
  deviceDeliveries: 120, sentToProvider: 110, dead: 2, receivedByApp: 70,
  openedFromPush: 35, readInApp: 25, opened: 35,
};
createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { return reply(400, {}); }
  if (replyDailyWordFixture(req, reply)) return;
  if (req.url === '/api/v1/auth/admin-email-login/requests') {
    if (data.email === 'down@example.test') return reply(503, { message: 'internal failure must not be exposed' });
    const challengeId = randomUUID();
    challenges.set(challengeId, data.email === admin.email);
    return reply(200, { challengeId, expiresInSeconds: 300, resendAfterSeconds: 60 });
  }
  if (req.url === '/api/v1/auth/admin-email-login/confirm') {
    if (!challenges.get(data.challengeId) || !['012345', '111111'].includes(data.code)) return reply(401, { message: 'internal verification failure' });
    challenges.delete(data.challengeId);
    return reply(200, {
      token: 'test-access-token', refreshToken: 'test-refresh-token', tokenType: 'Bearer',
      expiresIn: 3600, expiresAt: new Date(Date.now() + 3600000).toISOString(),
      user: { ...admin, role: data.code === '111111' ? 'USER' : 'ADMIN' },
    });
  }
  if (req.url === '/api/v1/auth/me' && req.headers.authorization === 'Bearer test-access-token') return reply(200, admin);
  if (req.url?.startsWith('/api/v1/admin/quiet-time/sessions?')) {
    if (req.headers.authorization !== 'Bearer test-access-token') return reply(403, {});
    const query = new URL(req.url, 'http://127.0.0.1:4181').searchParams;
    if (query.get('search') === 'outage') return reply(503, {});
    const content = query.get('search') === 'empty' ? [] : [quietTimeItem];
    return reply(200, { content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0 });
  }
  if (req.url?.startsWith('/api/v1/admin/notifications/operations?')) {
    if (req.headers.authorization !== 'Bearer test-access-token') return reply(403, {});
    const query = new URL(req.url, 'http://127.0.0.1:4181').searchParams;
    const fromDate = query.get('from') ? new Date(query.get('from')).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : null;
    if (fromDate === '2026-11-19') return reply(503, {});
    const broadcasts = fromDate === '2026-11-18' ? [] : [notificationItem];
    const hasBroadcast = broadcasts.length > 0;
    return reply(200, {
      from: query.get('from') ?? '2026-11-15T00:00:00Z', to: query.get('to') ?? '2026-11-16T23:59:59Z',
      generatedAt: listTime,
      summary: { broadcasts: broadcasts.length, deviceDeliveries: hasBroadcast ? 120 : 0, pending: hasBroadcast ? 1 : 0, processing: 0, retryWait: hasBroadcast ? 7 : 0, sentToProvider: hasBroadcast ? 110 : 0, dead: hasBroadcast ? 2 : 0, receivedByApp: hasBroadcast ? 70 : 0, openedFromPush: hasBroadcast ? 35 : 0, readInApp: hasBroadcast ? 25 : 0, opened: hasBroadcast ? 35 : 0 },
      broadcasts, page: 0, size: 20, totalElements: broadcasts.length, totalPages: broadcasts.length ? 1 : 0, hasNext: false,
    });
  }
  if (req.url?.startsWith('/api/v1/admin/ai/history?')) {
    if (req.headers.authorization !== 'Bearer test-access-token') return reply(403, {});
    return reply(200, { items: [{ turnId: aiTurnId, userId: aiUserId, displayName: '질문자', email: 'member@example.test', questionPreview: '기도에 대해 묻고 싶어요', createdAt: '2026-10-27T08:00:00Z', revisionCount: 0 }], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  }
  if (req.url === `/api/v1/admin/ai/history/${aiTurnId}/review` && req.method === 'POST') {
    if (req.headers.authorization !== 'Bearer test-access-token') return reply(403, {});
    if (!['QUALITY_REVIEW', 'SAFETY_REVIEW', 'USER_SUPPORT'].includes(data.reason)) return reply(400, {});
    return reply(200, { userId: aiUserId, displayName: '질문자', email: 'member@example.test', createdAt: '2026-10-27T08:00:00Z', history: { rootTurnId: aiTurnId, question: '기도에 대해 묻고 싶어요', versions: [{ turnId: aiTurnId, kind: 'ORIGINAL', createdAt: '2026-10-27T08:00:00Z', answer: '기도는 마음을 하나님께 드리는 시간입니다.', citations: [], prayer: null }] } });
  }
  if (req.url === '/v3/api-docs') {
    if (req.headers.authorization !== 'Bearer test-access-token') return reply(401, { message: 'Unauthorized' });
    return reply(200, {
      openapi: '3.0.1', info: { title: '테스트 API', version: '1.0.0' },
      paths: { '/api/v1/test': { get: { summary: '테스트 조회', responses: { 200: { description: '성공' } } } } },
    });
  }
  if (req.url === '/health') return reply(200, { status: 'UP' });
  reply(404, {});
}).listen(4181, '127.0.0.1', () => console.log('Mock authentication backend ready on localhost:4181'));
