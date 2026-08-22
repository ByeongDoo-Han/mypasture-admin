import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_COOKIE, backendUrl, type AdminUser } from './backend';

/** 서버 렌더링 요청마다 관리자 JWT와 활성 ADMIN 권한을 확인합니다. */
export const requireAdminSession = cache(async (): Promise<{ user: AdminUser; accessToken: string }> => {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/login');
  const response = await fetch(backendUrl('/api/v1/auth/me'), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  }).catch(() => null);
  if (!response?.ok) redirect('/login');
  const user = await response.json() as AdminUser;
  if (user.role !== 'ADMIN') redirect('/login');
  return { user, accessToken };
});
