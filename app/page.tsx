import { EngineStatus } from "@/components/engine-status";
import { SessionList } from "@/components/session-list";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function HomePage() {
  const t = useTranslations();
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("app.name")}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">{t("app.tagline")}</p>
        <Link
          href="/upload"
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg hover:opacity-90"
        >
          {t("home.cta")}
        </Link>
        <p className="text-xs text-neutral-500">{t("home.phase")}</p>
      </div>
      <SessionList />
      <div className="flex justify-center">
        <EngineStatus />
      </div>
    </main>
  );
}
