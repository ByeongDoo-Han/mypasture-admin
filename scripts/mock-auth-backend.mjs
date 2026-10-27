import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { replyDailyWordFixture } from '../tests/fixtures/dailyWordRotation.mjs';

/** 브라우저 테스트에서 메일 발송과 운영 API를 대체하는 로컬 전용 서버입니다. */
const challenges = new Map();
const admin = { id: 'f71dd5ce-7e62-4abe-9172-e43c80a76742', email: 'admin@example.test', displayName: '테스트 관리자', role: 'ADMIN' };
const aiTurnId = 'e5f4f12e-315f-4cc9-91a4-182e8c42d619';
const aiUserId = 'a9ac5959-a79c-4ae1-a65a-c68cc8db29ec';
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
