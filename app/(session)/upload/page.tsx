import { UploadForm } from "@/components/upload-form";
import { useTranslations } from "next-intl";

/** SCR-01 업로드 — 파일 업로드 + 발표 설정 → 파싱 잡 → 추출 슬라이드 표시. */
export default function UploadPage() {
  const t = useTranslations("upload");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-neutral-600 dark:text-neutral-400">{t("desc")}</p>
      <UploadForm />
    </section>
  );
}
