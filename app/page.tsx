import { EngineStatus } from "@/components/engine-status";
import { SessionList } from "@/components/session-list";
import { useTranslations } from "next-intl";
import Link from "next/link";

const STEPS = [
  { icon: "📤", key: "step1" },
  { icon: "🎬", key: "step2" },
  { icon: "📊", key: "step3" },
] as const;

const WHYS = ["why1", "why2", "why3", "why4"] as const;

export default function HomePage() {
  const t = useTranslations();
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-12 px-6 py-12">
      {/* 히어로 — 가치를 즉시(슬라이드 올리면 AI가 먼저 시범 발표). */}
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("home.headline")}</h1>
        <p className="max-w-xl text-neutral-600 dark:text-neutral-400">{t("home.subhead")}</p>
        <Link
          href="/upload"
          className="mt-2 rounded-md bg-brand px-6 py-3 text-sm font-medium text-brand-fg hover:opacity-90"
        >
          {t("home.cta")}
        </Link>
        <p className="text-xs text-neutral-500">{t("home.ctaSub")}</p>
      </section>

      {/* 작동 방식 — 3단계. */}
      <section>
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t("home.stepsTitle")}
        </h2>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon, key }) => (
            <li
              key={key}
              className="rounded-lg border border-neutral-200 p-4 text-center dark:border-neutral-800"
            >
              <div className="text-2xl" aria-hidden>
                {icon}
              </div>
              <div className="mt-2 font-medium">{t(`home.${key}Title`)}</div>
              <p className="mt-1 text-sm text-neutral-500">{t(`home.${key}Desc`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 신뢰 포인트 — 프라이버시·무료·로컬·L1. */}
      <section>
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t("home.whyTitle")}
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WHYS.map((key) => (
            <li
              key={key}
              className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-900"
            >
              <span className="text-brand" aria-hidden>
                ✓
              </span>
              <span>{t(`home.${key}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <SessionList />

      <div className="flex justify-center">
        <EngineStatus />
      </div>
    </main>
  );
}
