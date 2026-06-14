import { useTranslations } from "next-intl";
import Link from "next/link";

export default function HomePage() {
  const t = useTranslations();
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{t("app.name")}</h1>
      <p className="text-neutral-600 dark:text-neutral-400">{t("app.tagline")}</p>
      <Link
        href="/upload"
        className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg hover:opacity-90"
      >
        {t("home.cta")}
      </Link>
      <p className="text-xs text-neutral-500">{t("home.phase")}</p>
    </main>
  );
}
