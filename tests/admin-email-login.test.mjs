import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { adminLoginSessionSchema, emailLoginChallengeSchema, emailLoginConfirmSchema, emailLoginRequestSchema, isAdminLoginSameOrigin, isStrictSameOrigin } from '../src/features/auth/adminEmailLoginContracts.ts';

const { NextRequest } = createRequire(import.meta.url)('next/server');

const challengeId = '10000000-0000-4000-8000-000000000001';

test('origin requires an exact HTTP scheme, host and port without credentials or malformed values', () => {
  const target = 'https://admin.example.test/api/auth/login';
  assert.equal(isStrictSameOrigin('https://admin.example.test', target), true);
  for (const origin of [null, '', 'null', 'invalid', 'http://admin.example.test', 'https://admin.example.test:444', 'https://other.example.test', 'https://admin.example.test/', 'https://admin.example.test/path', 'https://name@admin.example.test', 'https://admin.example.test#fragment', 'https://admin.example.test https://evil.example.test']) {
    assert.equal(isStrictSameOrigin(origin, target), false);
  }
  assert.equal(isStrictSameOrigin('http://localhost:3000', 'http://localhost:3000/api/auth/login'), true);
});

test('actual NextRequest localhost normalization uses original Host and does not trust forwarded host', () => {
  const request = new NextRequest('http://127.0.0.1:4180/api/auth/login/request', {
    headers: { host: '127.0.0.1:4180', origin: 'http://127.0.0.1:4180', 'x-forwarded-host': 'evil.example.test' },
  });
  assert.equal(new URL(request.url).hostname, 'localhost');
  assert.equal(isAdminLoginSameOrigin(request.headers.get('origin'), request.url, request.headers.get('host'), false), true);
  assert.equal(isAdminLoginSameOrigin('http://localhost:4180', request.url, request.headers.get('host'), false), false);
  assert.equal(isAdminLoginSameOrigin('http://evil.example.test', request.url, request.headers.get('host'), false), false);
  assert.equal(isAdminLoginSameOrigin('https://127.0.0.1:4180', request.url, request.headers.get('host'), false), false);
});

test('production proxy uses HTTPS and exact public Host, rejecting malformed Origin and Host', () => {
  const internalUrl = 'http://internal-function:3000/api/auth/login/request';
  const origin = 'https://admin.example.test';
  assert.equal(isAdminLoginSameOrigin(origin, internalUrl, 'admin.example.test', true), true);
  assert.equal(isAdminLoginSameOrigin('http://admin.example.test', internalUrl, 'admin.example.test', true), false);
  assert.equal(isAdminLoginSameOrigin(origin, internalUrl, 'evil.example.test', true), false);
  for (const malformed of [null, '', 'null', 'bad', 'https://admin.example.test/', 'https://user@admin.example.test']) {
    assert.equal(isAdminLoginSameOrigin(malformed, internalUrl, 'admin.example.test', true), false);
  }
  for (const host of [null, '', 'admin.example.test,evil.example.test', 'admin.example.test/path', 'user@admin.example.test', 'admin.example.test#x', 'admin.example.test?x', 'admin.example.test\\path', ' admin.example.test']) {
    assert.equal(isAdminLoginSameOrigin(origin, internalUrl, host, true), false);
  }
});

test('OTP is six digits as a string and keeps a leading zero; old password payload is rejected', () => {
  assert.equal(emailLoginConfirmSchema.parse({ challengeId, code: '012345' }).code, '012345');
  for (const code of [123456, '12345', '1234567', 'abcdef', '12345\n', '123456\n']) {
    assert.equal(emailLoginConfirmSchema.safeParse({ challengeId, code }).success, false);
  }
  assert.equal(emailLoginConfirmSchema.safeParse({ challengeId, code: '012345', password: 'unused' }).success, false);
  assert.equal(emailLoginConfirmSchema.safeParse({ email: 'operator@example.test', password: 'unused' }).success, false);
  assert.equal(emailLoginConfirmSchema.safeParse({ challengeId: 'bad', code: '012345' }).success, false);
  assert.deepEqual(emailLoginRequestSchema.parse({ email: ' operator@example.test ' }), { email: 'operator@example.test' });
  assert.equal(emailLoginRequestSchema.safeParse({ email: 'operator@example.test', password: 'unused' }).success, false);
});

test('challenge response is bounded and strips unexpected secrets', () => {
  const payload = { challengeId, expiresInSeconds: 300, resendAfterSeconds: 60 };
  assert.deepEqual(emailLoginChallengeSchema.parse({ ...payload, code: '012345', email: 'operator@example.test' }), payload);
  for (const extra of [{ expiresInSeconds: -1 }, { expiresInSeconds: Infinity }, { resendAfterSeconds: 301 }, { resendAfterSeconds: -1 }, { challengeId: 'bad' }]) {
    assert.equal(emailLoginChallengeSchema.safeParse({ ...payload, ...extra }).success, false);
  }
});

test('session contract fails closed for malformed or expired tokens and strips extra user fields', () => {
  const payload = {
    token: 'test.access.token', refreshToken: 'test-refresh-token', tokenType: 'Bearer',
    expiresIn: 300, expiresAt: new Date(Date.now() + 300_000).toISOString(),
    user: { id: challengeId, displayName: 'Test operator', email: 'operator@example.test', role: 'ADMIN', secret: 'should-not-leave-bff' },
  };
  const session = adminLoginSessionSchema.parse(payload);
  assert.equal(Object.hasOwn(session.user, 'secret'), false);
  for (const extra of [{ token: '' }, { token: 'bad;cookie' }, { token: 'bad\n' }, { refreshToken: null }, { tokenType: 'Basic' }, { expiresIn: 0 }, { expiresIn: 1.5 }, { expiresAt: 'bad' }, { expiresAt: new Date(0).toISOString() }, { user: null }]) {
    assert.equal(adminLoginSessionSchema.safeParse({ ...payload, ...extra }).success, false);
  }
});
