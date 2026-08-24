import type { NextRequest } from 'next/server';
import { proxyNotificationOperations } from '../../../../../features/notification/notificationProxy';

/** 브라우저의 제한된 필터 요청을 백엔드 관리자 API로 전달합니다. */
export async function GET(request: NextRequest) {
  return proxyNotificationOperations(request);
}
