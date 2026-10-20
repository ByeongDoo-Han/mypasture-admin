import { FileCode2 } from 'lucide-react';
import { AdminApiDocs } from '../../../features/api-docs/AdminApiDocs';
import { getAdminApiSpecification } from '../../../features/api-docs/apiDocs';
import { requireAdminSession } from '../../../lib/adminSession';

export const dynamic = 'force-dynamic';

/** 로그인한 관리자만 서버가 가져온 OpenAPI 문서를 읽는 화면입니다. */
export default async function ApiDocsPage() {
  await requireAdminSession();
  const specification = await getAdminApiSpecification().catch(() => null);
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800"><FileCode2 size={20} /></span>
        <div>
          <p className="text-sm font-medium text-emerald-700">개발 문서</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">API 문서</h1>
          <p className="mt-2 text-sm text-slate-600">관리자 로그인 후 조회할 수 있습니다. 이 화면에서는 API 요청을 실행할 수 없습니다.</p>
        </div>
      </header>
      {specification ? <AdminApiDocs specification={specification} /> : (
        <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          API 문서를 불러오지 못했습니다. 백엔드 연결과 관리자 권한을 확인해 주세요.
          <a href="/api-docs" className="mt-3 block font-semibold underline">다시 불러오기</a>
        </div>
      )}
    </div>
  );
}
