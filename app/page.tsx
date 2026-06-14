export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">iamspeaker</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        오픈소스 발표 연습 웹앱 — 프로젝트 셋업(Phase 0) 진행 중.
      </p>
      <p className="text-sm text-neutral-500">
        진행 상황은{" "}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">PROGRESS.md</code> 참고
      </p>
    </main>
  );
}
