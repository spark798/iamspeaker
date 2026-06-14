import { WalkingSkeletonDemo } from "@/components/walking-skeleton-demo";
import { useTranslations } from "next-intl";

/** SCR-01 업로드 — Phase 0에서는 셸 자리표시자 + Walking Skeleton 데모. Phase 1에서 업로드 폼·파서 연결. */
export default function UploadPage() {
  const t = useTranslations("upload");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-neutral-600 dark:text-neutral-400">{t("desc")}</p>
      <p className="text-sm text-neutral-500">{t("phaseNote")}</p>
      <WalkingSkeletonDemo />
    </section>
  );
}
