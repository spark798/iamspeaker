import { Recorder } from "@/components/recorder";
import { getTranslations } from "next-intl/server";

/** SCR-04 연습 녹음 — MediaRecorder 음성 + 슬라이드 전환 타임스탬프 → analyze 잡. */
export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const t = await getTranslations("record");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {session ? (
        <Recorder sessionId={session} />
      ) : (
        <p className="text-sm text-neutral-500">{t("noSession")}</p>
      )}
    </section>
  );
}
