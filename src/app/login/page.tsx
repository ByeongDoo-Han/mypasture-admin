'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

/** 관리자 자격 증명을 브라우저에 저장하지 않고 동일 출처 BFF로만 전달하는 로그인 화면입니다. */
export default function AdminLoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
    }).catch(() => null);
    setPending(false);
    if (!response?.ok) {
      const body = await response?.json().catch(() => null) as { message?: string } | null;
      setError(body?.message ?? '로그인 서버에 연결할 수 없습니다.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">My Pasture</p>
        <h1 className="mt-2 text-xl font-semibold">관리자 로그인</h1>
        <label className="mt-6 block text-sm font-medium" htmlFor="email">이메일</label>
        <input className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" id="email" name="email" type="email" autoComplete="username" required />
        <label className="mt-4 block text-sm font-medium" htmlFor="password">비밀번호</label>
        <input className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3" id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <button className="mt-6 h-11 w-full rounded-md bg-emerald-700 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">
          {pending ? '확인 중' : '로그인'}
        </button>
      </form>
    </main>
  );
}
