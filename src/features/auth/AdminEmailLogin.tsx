'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { emailLoginChallengeSchema, emailLoginRequestSchema, type EmailLoginChallenge } from './adminEmailLoginContracts';

type ChallengeState = EmailLoginChallenge & { expiresAt: number; resendAt: number };

async function send(path: string, body: unknown) {
  return fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    cache: 'no-store', signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
}

function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** 로그인 코드를 메모리에만 유지하며 발송·확인·재발송·만료 상태를 안내합니다. */
export function AdminEmailLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [pending, setPending] = useState<'request' | 'confirm' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const [retryAt, setRetryAt] = useState(0);
  const busy = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!challenge && !retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge, retryAt]);
  useEffect(() => { if (challenge) codeInput.current?.focus(); }, [challenge]);

  const expiresIn = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0;
  const resendIn = Math.max(0, Math.ceil((Math.max(challenge?.resendAt ?? 0, retryAt) - now) / 1000));
  const expired = challenge !== null && expiresIn === 0;

  async function requestCode() {
    if (busy.current || Date.now() < Math.max(challenge?.resendAt ?? 0, retryAt)) return;
    const parsed = emailLoginRequestSchema.safeParse({ email });
    if (!parsed.success) { setError('올바른 이메일 주소를 입력해 주세요.'); return; }
    busy.current = true;
    setPending('request');
    setError('');
    setNotice('');
    const startedAt = Date.now();
    const response = await send('/api/auth/login/request', parsed.data);
    const body: unknown = await response?.json().catch(() => null);
    busy.current = false;
    setPending(null);
    setNow(Date.now());
    if (!response?.ok) {
      if (response?.status === 429) {
        setRetryAt(Date.now() + 60_000);
        setError('요청이 많습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        setError('코드 요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
      return;
    }
    const result = emailLoginChallengeSchema.safeParse(body);
    if (!result.success) { setError('로그인 서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'); return; }
    setEmail(parsed.data.email);
    setCode('');
    setRetryAt(0);
    setChallenge({
      ...result.data,
      // SMTP 응답에 걸린 시간까지 유효 시간으로 더하지 않습니다.
      expiresAt: startedAt + result.data.expiresInSeconds * 1000,
      resendAt: Date.now() + result.data.resendAfterSeconds * 1000,
    });
    setNotice('등록된 관리자 이메일이면 로그인 코드를 보내드립니다. 받은편지함과 스팸함을 확인해 주세요.');
  }

  async function confirmCode() {
    if (busy.current || !challenge) return;
    if (Date.now() >= challenge.expiresAt) { setNow(Date.now()); setError('코드가 만료되었습니다. 새 코드를 요청해 주세요.'); return; }
    if (!/^\d{6}$/.test(code)) { setError('이메일로 받은 6자리 코드를 입력해 주세요.'); return; }
    busy.current = true;
    setPending('confirm');
    setError('');
    const response = await send('/api/auth/login', { challengeId: challenge.challengeId, code });
    setCode('');
    if (!response?.ok) {
      busy.current = false;
      setPending(null);
      setNow(Date.now());
      setError(response?.status === 429
        ? '확인 요청이 많습니다. 잠시 후 다시 시도해 주세요.'
        : response?.status === 401 || response?.status === 400 || response?.status === 403
          ? '코드를 확인할 수 없습니다. 코드를 다시 확인하거나 새로 요청해 주세요.'
          : '로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      codeInput.current?.focus();
      return;
    }
    setChallenge(null);
    router.replace('/');
    router.refresh();
  }

  function changeEmail() {
    if (busy.current) return;
    setChallenge(null);
    setCode('');
    setError('');
    setNotice('');
    setTimeout(() => emailInput.current?.focus(), 0);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (challenge) void confirmCode(); else void requestCode();
  }

  return <main className="flex min-h-screen items-center justify-center px-5 py-8">
    <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm" aria-busy={pending !== null}>
      <p className="text-sm font-semibold text-emerald-700">My Pasture</p>
      <h1 className="mt-2 text-xl font-semibold">관리자 로그인</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">관리자 이메일로 받은 일회용 코드로 로그인합니다.</p>
      <label className="mt-6 block text-sm font-medium" htmlFor="email">이메일</label>
      <input ref={emailInput} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 disabled:bg-slate-50" id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} readOnly={challenge !== null} disabled={pending !== null} required />
      {challenge && <>
        <label className="mt-4 block text-sm font-medium" htmlFor="code">인증 코드</label>
        <input ref={codeInput} className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 font-mono text-xl tracking-[0.3em] disabled:bg-slate-50" id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={pending !== null || expired} aria-describedby="code-expiry" aria-invalid={Boolean(error)} required />
        <p id="code-expiry" className={`mt-2 text-sm ${expired ? 'text-red-700' : 'text-slate-600'}`}>{expired ? '코드가 만료되었습니다. 새 코드를 요청해 주세요.' : `유효 시간 ${timeLabel(expiresIn)}`}</p>
      </>}
      {notice && <p role="status" className="mt-3 text-sm leading-6 text-slate-600">{notice}</p>}
      {error && <p role="alert" className="mt-3 text-sm leading-6 text-red-700">{error}</p>}
      <button className="mt-6 min-h-11 w-full rounded-md bg-emerald-700 px-3 py-3 font-semibold text-white disabled:opacity-60" disabled={pending !== null || (challenge ? expired || code.length !== 6 : resendIn > 0)} type="submit">
        {pending === 'confirm' ? '로그인 확인 중…' : pending === 'request' ? '코드 요청 중…' : challenge ? '로그인' : resendIn > 0 ? `${resendIn}초 후 요청 가능` : '로그인 코드 받기'}
      </button>
      {challenge && <div className="mt-3 flex flex-wrap gap-2">
        <button className="min-h-11 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-60" type="button" disabled={pending !== null || resendIn > 0} onClick={() => { void requestCode(); }}>{resendIn > 0 ? `${resendIn}초 후 재발송` : '코드 재발송'}</button>
        <button className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-emerald-800 disabled:opacity-60" type="button" disabled={pending !== null} onClick={changeEmail}>이메일 변경</button>
      </div>}
    </form>
  </main>;
}
