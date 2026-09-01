'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BellRing, BookOpenText, BrainCircuit, CalendarCheck, Flag, Gift, ListChecks } from 'lucide-react';

const items = [
  { href: '/', label: '운영 현황', icon: BarChart3 },
  { href: '/quiet-time', label: 'QT 모임', icon: ListChecks },
  { href: '/daily-words', label: '오늘의 말씀', icon: CalendarCheck },
  { href: '/bible-commentaries', label: '장별 해설', icon: BookOpenText },
  { href: '/notifications', label: '알림 운영', icon: BellRing },
  { href: '/ai-models', label: 'AI 모델', icon: BrainCircuit },
  { href: '/moderation', label: '신고 관리', icon: Flag },
  { href: '/coupons', label: '이벤트 보상', icon: Gift },
];

/** 현재 경로를 표시하며 실제 구현된 관리자 화면만 노출하는 내비게이션입니다. */
export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 메뉴" className="flex gap-1 overflow-x-auto lg:block lg:space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium ${active ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
          >
            <Icon aria-hidden="true" size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
