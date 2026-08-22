import type { ReactNode } from 'react';
import { AdminShell } from '../../components/AdminShell';
import { requireAdminSession } from '../../lib/adminSession';

/** 모든 운영 화면 진입 전에 서버에서 활성 ADMIN 권한을 검증합니다. */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdminSession();
  return <AdminShell user={user}>{children}</AdminShell>;
}
