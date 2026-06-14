"use client";

import { useEffect } from "react";

/**
 * 루트 레이아웃까지 전파된 치명적 오류용 바운더리.
 * 자체 <html>/<body>를 렌더해야 한다(루트 레이아웃을 대체하므로).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-screen items-center justify-center bg-white text-neutral-900">
        <main className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
          <h1 className="text-xl font-semibold">앱을 불러오지 못했어요</h1>
          <p className="text-sm text-neutral-600">페이지를 새로고침하거나 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
