import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">iamspeaker</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        오픈소스 발표 연습 웹앱 — 슬라이드를 올리면 AI가 시범 발표를 만들고, 연습 녹음을 분석해
        피드백합니다.
      </p>
      <Link
        href="/upload"
        className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg hover:opacity-90"
      >
        시작하기
      </Link>
      <p className="text-xs text-neutral-500">프로젝트 셋업(Phase 0) 진행 중</p>
    </main>
  );
}
