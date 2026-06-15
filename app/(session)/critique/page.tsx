import { CritiqueView } from "@/components/critique-view";
import { getTranslations } from "next-intl/server";

/** SCR-01b 슬라이드 분석 — 정보 밀도/시간 대비 분량 비평(규칙 기반 + LLM). */
export default async function CritiquePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const t = await getTranslations("critique");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {session ? (
        <CritiqueView sessionId={session} />
      ) : (
        <p className="text-sm text-neutral-500">{t("noSession")}</p>
      )}
    </section>
  );
}
