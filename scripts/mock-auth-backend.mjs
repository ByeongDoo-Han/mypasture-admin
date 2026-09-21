import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

/** 브라우저 테스트에서 메일 발송과 운영 API를 대체하는 로컬 전용 서버입니다. */
const challenges = new Map();
const admin = { id: 'f71dd5ce-7e62-4abe-9172-e43c80a76742', email: 'admin@example.test', displayName: '테스트 관리자', role: 'ADMIN' };
createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { return reply(400, {}); }
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
  if (req.url === '/health') return reply(200, { status: 'UP' });
  reply(404, {});
}).listen(4181, '127.0.0.1', () => console.log('Mock authentication backend ready on localhost:4181'));
