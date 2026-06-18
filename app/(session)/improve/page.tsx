import { ImproveView } from "@/components/improve-view";
import { getTranslations } from "next-intl/server";

/** SCR-06 개선 제안 — 분석 결과 기반 AI 개선본(diff) + 부분/전체 적용(새 버전 저장). */
export default async function ImprovePage({
  searchParams,
}: {
  searchParams: Promise<{ recording?: string }>;
}) {
  const { recording } = await searchParams;
  const t = await getTranslations("improve");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {recording ? (
        <ImproveView recordingId={recording} />
      ) : (
        <p className="text-sm text-neutral-500">{t("noRecording")}</p>
      )}
    </section>
  );
}
