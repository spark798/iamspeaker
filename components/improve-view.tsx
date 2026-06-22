"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface DiffEntry {
  slideIndex: number;
  original: string;
  improved: string;
  reason: string;
}
interface SlideScript {
  slideIndex: number;
  text: string;
}

export function ImproveView({ recordingId }: { recordingId: string }) {
  const t = useTranslations("improve");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState<SlideScript[]>([]);
  const [entries, setEntries] = useState<DiffEntry[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/recordings/${recordingId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((rec: { sessionId: string } | null) => {
        if (!rec) return;
        setSessionId(rec.sessionId);
        return fetch(`/api/sessions/${rec.sessionId}/script`)
          .then((r) => (r.ok ? r.json() : null))
          .then((b: { content: SlideScript[] } | null) => b && setCurrent(b.content));
      })
      .catch(() => setError(te("loadFailed")));
  }, [recordingId, te]);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    setApplied(null);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/improve`, { method: "POST" });
      if (!res.ok) throw new Error(te("parseFailed"));
      const { jobId } = (await res.json()) as { jobId: string };
      const es = new EventSource(`/api/jobs/${jobId}/stream`);
      es.onmessage = async (ev) => {
        const d = JSON.parse(ev.data) as { status: string; error?: string | null };
        if (d.status === "succeeded") {
          es.close();
          const job = (await (await fetch(`/api/jobs/${jobId}`)).json()) as {
            result: { entries: DiffEntry[] };
          };
          setEntries(job.result.entries);
          setSelected(new Set(job.result.entries.map((e) => e.slideIndex)));
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
  }, [recordingId, te]);

  const toggle = (slideIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slideIndex)) next.delete(slideIndex);
      else next.add(slideIndex);
      return next;
    });
  };

  const apply = useCallback(async () => {
    if (!sessionId || !entries) return;
    setBusy(true);
    setError(null);
    try {
      const byIndex = new Map(entries.map((e) => [e.slideIndex, e]));
      const content = current.map((c) => {
        const e = byIndex.get(c.slideIndex);
        return {
          slideIndex: c.slideIndex,
          text: e && selected.has(c.slideIndex) ? e.improved : c.text,
        };
      });
      const res = await fetch(`/api/sessions/${sessionId}/scripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(te("saveFailed"));
      const { version } = (await res.json()) as { version: number };
      setApplied(version);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [sessionId, entries, current, selected, te]);

  const hasEntries = entries !== null && entries.length > 0;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("generating") : entries ? t("regenerate") : t("generate")}
        </button>
        {hasEntries && (
          <button
            type="button"
            onClick={() => void apply()}
            disabled={busy || selected.size === 0}
            className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
          >
            {t("apply")} ({selected.size})
          </button>
        )}
        {applied !== null && (
          <span className="text-sm text-green-600">{t("applied", { version: applied })}</span>
        )}
        {sessionId && (
          <Link
            href={`/qa?session=${sessionId}`}
            className="ml-auto text-sm font-medium text-brand hover:underline"
          >
            {t("toQa")}
          </Link>
        )}
      </div>

      {busy && <p className="text-xs text-neutral-400">{tc("slowHint")}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {entries === null && !busy && <p className="text-sm text-neutral-500">{t("empty")}</p>}
      {entries !== null && entries.length === 0 && (
        <p className="text-sm text-neutral-500">{t("noChanges")}</p>
      )}

      <ol className="space-y-3">
        {entries?.map((e) => (
          <li
            key={e.slideIndex}
            className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <input
                type="checkbox"
                checked={selected.has(e.slideIndex)}
                onChange={() => toggle(e.slideIndex)}
              />
              {t("slide")} {e.slideIndex + 1}
            </label>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div className="rounded bg-neutral-50 p-2 text-sm text-neutral-500 dark:bg-neutral-900">
                <div className="text-xs font-medium">{t("original")}</div>
                {e.original}
              </div>
              <div className="rounded bg-brand/10 p-2 text-sm">
                <div className="text-xs font-medium text-brand">{t("improved")}</div>
                {e.improved}
              </div>
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              {t("reason")}: {e.reason}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
