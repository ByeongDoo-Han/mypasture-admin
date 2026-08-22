import type { ReactNode } from 'react';
import type { AdminUser } from '../lib/backend';
import { AdminNavigation } from './AdminNavigation';
import { LogoutButton } from './LogoutButton';

/** 보호된 관리자 화면에 공통 내비게이션과 계정 정보를 제공하는 운영 레이아웃입니다. */
export function AdminShell({ user, children }: { user: AdminUser; children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
        <div className="mb-4 px-2 lg:mb-8">
          <p className="text-base font-bold text-slate-950">My Pasture</p>
          <p className="mt-1 text-xs text-slate-500">운영 관리자</p>
        </div>
        <AdminNavigation />
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 lg:mt-auto lg:block lg:px-1">
          <div className="min-w-0 px-2 py-2">
            <p className="truncate text-sm font-medium text-slate-800">{user.displayName}</p>
            <p className="truncate text-xs text-slate-500">{user.email ?? '관리자 계정'}</p>
          </div>
          <div className="w-28 lg:w-full"><LogoutButton /></div>
        </div>
      </aside>
      <main className="min-w-0 bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
