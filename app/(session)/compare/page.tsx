import { CompareView } from "@/components/compare-view";
import { getTranslations } from "next-intl/server";

/** 회차 나란히 비교 — 두 녹음의 점수·지표를 델타와 함께. */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const t = await getTranslations("compare");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {a && b ? (
        <CompareView a={a} b={b} />
      ) : (
        <p className="text-sm text-neutral-500">{t("noSelection")}</p>
      )}
    </section>
  );
}
