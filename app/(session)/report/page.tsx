import { ReportView } from "@/components/report-view";
import { getTranslations } from "next-intl/server";

/** SCR-05 피드백 리포트 — WPM/필러워드/슬라이드 시간배분 시각화. */
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ recording?: string }>;
}) {
  const { recording } = await searchParams;
  const t = await getTranslations("report");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {recording ? (
        <ReportView recordingId={recording} />
      ) : (
        <p className="text-sm text-neutral-500">{t("noRecording")}</p>
      )}
    </section>
  );
}
