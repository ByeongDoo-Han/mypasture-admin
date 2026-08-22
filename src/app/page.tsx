const metrics = [
  { label: '활성 사용자', value: '20,000' },
  { label: '오늘 AI 요청', value: '58,420' },
  { label: '예상 AI 비용', value: '$54.10' },
  { label: '활성 목장', value: '1,248' },
];

export default async function AdminDashboardPage() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/login');
  const response = await fetch(backendUrl('/api/v1/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  }).catch(() => null);
  if (!response?.ok) redirect('/login');
  const user = await response.json() as AdminUser;
  if (user.role !== 'ADMIN') redirect('/login');

  return (
    <main className="min-h-screen px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Pasture Admin</h1>
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <span>Users</span>
          <span>Daily Word</span>
          <span>Challenges</span>
          <span>Push</span>
          <span>AI Usage</span>
          <LogoutButton />
        </nav>
      </header>
      <section className="grid grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
          </article>
        ))}
      </section>
      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">AI 운영 상태</h2>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <p>무료 회원 일일 제한: 10회</p>
          <p>입력 제한: 300자</p>
          <p>RAG 없는 답변: 차단</p>
        </div>
      </section>
    </main>
  );
}
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LogoutButton } from '../components/LogoutButton';
import { ACCESS_COOKIE, backendUrl, type AdminUser } from '../lib/backend';

