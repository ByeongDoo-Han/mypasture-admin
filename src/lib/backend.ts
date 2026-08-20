export type AdminUser = {
  id: string;
  email?: string;
  displayName: string;
  role: 'USER' | 'PREMIUM' | 'PASTURE_LEADER' | 'ADMIN';
};

/** 관리자 서버에서만 사용하는 백엔드 주소를 검증해 브라우저 번들 노출을 막습니다. */
export function backendUrl(path: string): string {
  const base = (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');
  if (!base) throw new Error('API_BASE_URL is required');
  if (appEnvironment() === 'prod' && !base.startsWith('https://')) {
    throw new Error('Production API_BASE_URL must use HTTPS');
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const ACCESS_COOKIE = appEnvironment() === 'prod' ? '__Host-mypasture_admin_access' : 'mypasture_admin_access';
export const REFRESH_COOKIE = appEnvironment() === 'prod' ? '__Host-mypasture_admin_refresh' : 'mypasture_admin_refresh';

export function secureCookie(): boolean {
  return appEnvironment() === 'prod';
}

function appEnvironment(): string | undefined {
  return process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV;
}
