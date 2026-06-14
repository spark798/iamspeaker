"use client";

import { useEffect } from "react";

/**
 * 라우트 세그먼트 에러 바운더리 (App Router 규칙).
 * 렌더/데이터 오류 발생 시 이 화면으로 폴백하고, 재시도를 제공한다.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 클라이언트 측 오류 — 콘솔에 남긴다(서버 로깅은 라우트 핸들러/worker에서).
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">문제가 발생했어요</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        잠시 후 다시 시도해 주세요. 문제가 계속되면 페이지를 새로고침하세요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
      >
        다시 시도
      </button>
    </main>
  );
}
