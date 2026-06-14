"use client";

import { estimateSpeakingSec } from "@/lib/script/estimate";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

interface Slide {
  index: number;
  textContent: string;
  notes: string | null;
}
interface SlideScript {
  slideIndex: number;
  text: string;
}

function toMap(content: SlideScript[]): Record<number, string> {
  const m: Record<number, string> = {};
  for (const c of content) m[c.slideIndex] = c.text;
  return m;
}

export function ScriptEditor({ sessionId }: { sessionId: string }) {
  const t = useTranslations("editor");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [demoRef, setDemoRef] = useState<Record<number, string>>({});
  const [showRef, setShowRef] = useState(false);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/slides`)
      .then((r) => r.json())
      .then((b: { slides: Slide[] }) => setSlides(b.slides))
      .catch(() => {});
    fetch(`/api/sessions/${sessionId}/script`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { content: SlideScript[] } | null) => b && setTexts(toMap(b.content)))
      .catch(() => {});
    fetch(`/api/sessions/${sessionId}/script?version=0`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { content: SlideScript[] } | null) => b && setDemoRef(toMap(b.content)))
      .catch(() => {});
  }, [sessionId]);

  const estimate = useMemo(() => estimateSpeakingSec(Object.values(texts)), [texts]);
  const mm = Math.floor(estimate / 60);
  const ss = String(estimate % 60).padStart(2, "0");
  const hasDemoRef = Object.keys(demoRef).length > 0;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const content = slides.map((s) => ({ slideIndex: s.index, text: texts[s.index] ?? "" }));
      const res = await fetch(`/api/sessions/${sessionId}/scripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const { version } = (await res.json()) as { version: number };
      setSavedVersion(version);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {t("estimatedTime")}:{" "}
          <span className="font-medium">
            {mm}:{ss}
          </span>
        </span>
        {hasDemoRef && (
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={showRef}
              onChange={(e) => setShowRef(e.target.checked)}
            />
            {t("showReference")}
          </label>
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="ml-auto rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("saving") : t("save")}
        </button>
        {savedVersion !== null && !saving && (
          <span className="text-sm text-green-600">{t("saved", { version: savedVersion })}</span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ol className="space-y-4">
        {slides.map((s) => (
          <li
            key={s.index}
            className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <div className="text-xs font-medium text-neutral-500">
              {t("slide")} {s.index + 1}
            </div>
            <div className="mt-1 text-xs text-neutral-500">{s.textContent}</div>
            {showRef && demoRef[s.index] && (
              <div className="mt-2 rounded bg-neutral-50 p-2 text-xs text-neutral-500 dark:bg-neutral-900">
                <span className="font-medium">{t("reference")}:</span> {demoRef[s.index]}
              </div>
            )}
            <textarea
              value={texts[s.index] ?? ""}
              onChange={(e) => setTexts((prev) => ({ ...prev, [s.index]: e.target.value }))}
              placeholder={t("placeholder")}
              rows={3}
              className="mt-2 w-full rounded border border-neutral-300 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
