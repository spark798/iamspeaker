import { QaView } from "@/components/qa-view";
import { getTranslations } from "next-intl/server";

/** SCR-08 Q&A 대비 — 슬라이드+스크립트 기반 예상 질문 생성·표시. (답변 녹음/평가는 SCR-08b) */
export default async function QaPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const t = await getTranslations("qa");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {session ? (
        <QaView sessionId={session} />
      ) : (
        <p className="text-sm text-neutral-500">{t("noSession")}</p>
      )}
    </section>
  );
}
