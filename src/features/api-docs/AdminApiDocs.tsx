'use client';

import { useEffect, useRef } from 'react';
import 'swagger-ui-dist/swagger-ui.css';

/** 관리자에게 API 명세를 조회 전용 Swagger 화면으로 표시합니다. */
export function AdminApiDocs({ specification }: { specification: Record<string, unknown> }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    let disposed = false;
    let instance: { destroy?: () => void } | undefined;
    import('swagger-ui-dist/swagger-ui-bundle.js').then(({ default: SwaggerUIBundle }) => {
      if (disposed) return;
      instance = SwaggerUIBundle({ domNode: node, spec: specification, supportedSubmitMethods: [], docExpansion: 'none' });
    });
    return () => {
      disposed = true;
      instance?.destroy?.();
      node.replaceChildren();
    };
  }, [specification]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-4 sm:px-6">
      <div ref={container} />
    </div>
  );
}
