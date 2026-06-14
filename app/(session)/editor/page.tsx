import { ScriptEditor } from "@/components/script-editor";
import { getTranslations } from "next-intl/server";

/** SCR-03 스크립트 편집기 — AI 데모를 베이스로 슬라이드별 스크립트 편집·저장(version 1+). */
export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const t = await getTranslations("editor");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {session ? (
        <ScriptEditor sessionId={session} />
      ) : (
        <p className="text-sm text-neutral-500">{t("noSession")}</p>
      )}
    </section>
  );
}
