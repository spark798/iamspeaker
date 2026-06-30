"use client";

import { errorKeyForStatus } from "@/lib/api/error-key";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Critique {
  slideIndex: number;
  textDensity: "low" | "medium" | "high";
  estimatedReadTimeSec: number;
  issues: string[];
  suggestions: string[];
}

const densityClass: Record<Critique["textDensity"], string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function CritiqueView({ sessionId }: { sessionId: string }) {
  const t = useTranslations("critique");
  const te = useTranslations("errors");
  const [critiques, setCritiques] = useState<Critique[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/sessions/${sessionId}/critiques`)
      .then((r) => r.json())
      .then((b: { critiques: Critique[] }) => setCritiques(b.critiques))
      .catch(() => setError(te("loadFailed")));
  }, [sessionId, te]);

  useEffect(() => load(), [load]);

  const analyze = useCallback(async () => {
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/critique`, { method: "POST" });
      if (!res.ok) throw new Error(te(errorKeyForStatus(res.status) ?? "parseFailed"));
      const { jobId } = (await res.json()) as { jobId: string };
      const es = new EventSource(`/api/jobs/${jobId}/stream`);
      es.onmessage = (ev) => {
        const d = JSON.parse(ev.data) as {
          status: string;
          progress: number;
          error?: string | null;
        };
        setProgress(d.progress);
        if (d.status === "succeeded") {
          es.close();
          load();
          setBusy(false);
        } else if (d.status === "failed") {
          es.close();
          setError(d.error ?? te("parseFailed"));
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
  }, [sessionId, te, load]);

  const hasResult = critiques.length > 0;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void analyze()}
          disabled={busy}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("analyzing") : hasResult ? t("reanalyze") : t("analyze")}
        </button>
        {busy && (
          <div className="h-2 flex-1 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
            <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {hasResult && !busy && (
          <Link
            href={`/demo?session=${sessionId}`}
            className="ml-auto rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
          >
            {t("toDemo")}
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {!hasResult && !busy && <p className="text-sm text-neutral-500">{t("empty")}</p>}

      <ol className="space-y-3">
        {critiques.map((c) => (
          <li
            key={c.slideIndex}
            className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-500">
                {t("slide")} {c.slideIndex + 1}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${densityClass[c.textDensity]}`}
              >
                {t("density")}: {t(c.textDensity)}
              </span>
              <span className="text-xs text-neutral-500">
                {t("readTime")}: {c.estimatedReadTimeSec}
              </span>
            </div>
            {c.issues.length === 0 && c.suggestions.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">{t("noIssues")}</p>
            ) : (
              <div className="mt-2 space-y-2 text-sm">
                {c.issues.length > 0 && (
                  <div>
                    <span className="font-medium text-red-600">{t("issues")}</span>
                    <ul className="ml-4 list-disc text-neutral-700 dark:text-neutral-300">
                      {c.issues.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {c.suggestions.length > 0 && (
                  <div>
                    <span className="font-medium text-brand">{t("suggestions")}</span>
                    <ul className="ml-4 list-disc text-neutral-700 dark:text-neutral-300">
                      {c.suggestions.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
