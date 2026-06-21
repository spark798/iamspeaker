"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Slide {
  index: number;
  textContent: string;
  notes: string | null;
}
interface SlideScript {
  slideIndex: number;
  text: string;
}

export function DemoView({ sessionId }: { sessionId: string }) {
  const t = useTranslations("demo");
  const te = useTranslations("errors");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [script, setScript] = useState<SlideScript[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/slides`)
      .then((r) => r.json())
      .then((b: { slides: Slide[] }) => setSlides(b.slides))
      .catch(() => setError(te("loadFailed")));
    fetch(`/api/sessions/${sessionId}/script`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { content: SlideScript[] } | null) => b && setScript(b.content))
      .catch(() => {});
  }, [sessionId, te]);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/demo`, { method: "POST" });
      if (!res.ok) throw new Error(te("demoFailed"));
      const { jobId } = (await res.json()) as { jobId: string };
      const es = new EventSource(`/api/jobs/${jobId}/stream`);
      es.onmessage = async (ev) => {
        const d = JSON.parse(ev.data) as {
          status: string;
          progress: number;
          error?: string | null;
        };
        setProgress(d.progress);
        if (d.status === "succeeded") {
          es.close();
          const b = (await (await fetch(`/api/sessions/${sessionId}/script`)).json()) as {
            content: SlideScript[];
          };
          setScript(b.content);
          setBusy(false);
        } else if (d.status === "failed") {
          es.close();
          setError(d.error ?? te("demoFailed"));
          setBusy(false);
        }
      };
      es.onerror = () => {
        es.close();
        setError(te("connection"));
        setBusy(false);
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }, [sessionId, te]);

  const scriptByIndex = new Map(script.map((s) => [s.slideIndex, s.text]));
  const hasScript = script.length > 0;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("generating") : hasScript ? t("regenerate") : t("generate")}
        </button>
        {busy && (
          <div className="h-2 flex-1 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
            <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {hasScript && !busy && (
          <Link
            href={`/editor?session=${sessionId}`}
            className="ml-auto text-sm font-medium text-brand hover:underline"
          >
            {t("toEditor")}
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!hasScript && !busy && <p className="text-sm text-neutral-500">{t("empty")}</p>}

      <ol className="space-y-3">
        {slides.map((s) => (
          <li
            key={s.index}
            className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <div className="text-xs font-medium text-neutral-500">
              {t("slide")} {s.index + 1}
            </div>
            <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
              {s.textContent}
            </div>
            {scriptByIndex.has(s.index) && (
              <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <div className="text-xs font-medium text-brand">{t("script")}</div>
                <p className="mt-1 text-sm">{scriptByIndex.get(s.index)}</p>
                <div className="mt-2">
                  <div className="mb-1 text-xs text-neutral-500">{t("listen")}</div>
                  <audio
                    controls
                    preload="none"
                    className="h-8 w-full max-w-md"
                    src={`/api/sessions/${sessionId}/demo-audio?slide=${s.index}`}
                  >
                    <track kind="captions" />
                  </audio>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
