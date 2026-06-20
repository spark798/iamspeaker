import { ProgressView } from "@/components/progress-view";
import { getTranslations } from "next-intl/server";

/** SCR-07 진행 기록 — 회차별 WPM/필러 추이. (다국어 출력은 Phase 2) */
export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const t = await getTranslations("progress");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {session ? (
        <ProgressView sessionId={session} />
      ) : (
        <p className="text-sm text-neutral-500">{t("noSession")}</p>
      )}
    </section>
  );
}
