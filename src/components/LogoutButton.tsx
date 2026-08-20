'use client';

/** 서버 세션과 HttpOnly 쿠키를 함께 정리하는 관리자 로그아웃 버튼입니다. */
export function LogoutButton() {
  return <button className="text-sm font-medium text-red-700" onClick={async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }}>로그아웃</button>;
}
