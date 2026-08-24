import { BellRing } from 'lucide-react';
import { NotificationOperationsView } from '../../../features/notification/NotificationOperations';
import { getNotificationOperations } from '../../../features/notification/notificationAdmin';

/** provider 접수와 실제 앱 열람을 구분하는 사용자 알림 운영 페이지입니다. */
export default async function NotificationsPage() {
  const operations = await getNotificationOperations().catch(() => null);
  return <div className="mx-auto max-w-7xl"><header className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800"><BellRing size={20} /></span><div><p className="text-sm font-medium text-emerald-700">메시징 운영</p><h1 className="mt-1 text-2xl font-bold text-slate-950">사용자 알림</h1><p className="mt-2 text-sm text-slate-600">공통 알림, 기기별 FCM 처리와 인앱 열람을 분리해 확인합니다.</p></div></header>{operations ? <NotificationOperationsView initial={operations} /> : <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">알림 운영 데이터를 불러오지 못했습니다. 백엔드 연결과 관리자 권한을 확인해 주세요.</div>}</div>;
}
