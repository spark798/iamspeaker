import { DemoView } from "@/components/demo-view";
import { getTranslations } from "next-intl/server";

/** SCR-02 AI 데모 — 파싱된 슬라이드 기반으로 AI 데모 스크립트를 생성·표시. */
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const t = await getTranslations("demo");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {session ? (
        <DemoView sessionId={session} />
      ) : (
        <p className="text-sm text-neutral-500">{t("noSession")}</p>
      )}
    </section>
  );
}
