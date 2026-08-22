'use client';

import { LogOut } from 'lucide-react';

/** 서버 세션과 HttpOnly 쿠키를 함께 정리하는 관리자 로그아웃 버튼입니다. */
export function LogoutButton() {
  return <button className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700" onClick={async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }}><LogOut aria-hidden="true" size={17} />로그아웃</button>;
}
