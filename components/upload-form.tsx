"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { type FormEvent, useState } from "react";

interface Slide {
  index: number;
  textContent: string;
  notes: string | null;
}

type Phase = "idle" | "uploading" | "parsing" | "done" | "error";

export function UploadForm() {
  const t = useTranslations("uploadForm");
  const te = useTranslations("errors");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSlides(null);
    setProgress(0);
    setPhase("uploading");

    const formEl = e.currentTarget;
    const data = new FormData(formEl);
    const minutes = Number(data.get("minutes") ?? 5);
    data.set("targetDurationSec", String(Math.max(1, Math.round(minutes * 60))));
    data.delete("minutes");

    try {
      const res = await fetch("/api/sessions/upload", { method: "POST", body: data });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? te("uploadFailed"));
      }
      const { sessionId: sid, jobId } = (await res.json()) as {
        sessionId: string;
        jobId: string;
      };
      setSessionId(sid);

      setPhase("parsing");
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
          const sres = await fetch(`/api/sessions/${sid}/slides`);
          const body = (await sres.json()) as { slides: Slide[] };
          setSlides(body.slides);
          setPhase("done");
        } else if (d.status === "failed") {
          es.close();
          setError(d.error ?? te("parseFailed"));
          setPhase("error");
        }
      };
      es.onerror = () => {
        es.close();
        setError(te("connection"));
        setPhase("error");
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  const busy = phase === "uploading" || phase === "parsing";

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="file" className="text-sm font-medium">
          {t("file")}
        </label>
        <input id="file" name="file" type="file" accept=".pptx,.pdf" required className="text-sm" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("targetMinutes")}
          <input
            name="minutes"
            type="number"
            min={1}
            max={60}
            defaultValue={5}
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("tone")}
          <select
            name="tone"
            defaultValue="formal"
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="formal">{t("toneFormal")}</option>
            <option value="casual">{t("toneCasual")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("genre")}
          <select
            name="genre"
            defaultValue="talk"
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="talk">{t("genreTalk")}</option>
            <option value="pitch">{t("genrePitch")}</option>
            <option value="lecture">{t("genreLecture")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("language")}
          <input
            name="language"
            defaultValue="en"
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("nativeLanguage")}
          <select
            name="nativeLanguage"
            defaultValue="ko"
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="ko">{t("nativeKo")}</option>
            <option value="ja">{t("nativeJa")}</option>
            <option value="zh">{t("nativeZh")}</option>
            <option value="es">{t("nativeEs")}</option>
            <option value="en">{t("nativeEn")}</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
      >
        {phase === "uploading" ? t("uploading") : phase === "parsing" ? t("parsing") : t("submit")}
      </button>

      {busy && (
        <div className="h-2 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
          <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {slides && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-medium">
              {t("done")} — {t("slidesHeading")} ({slides.length})
            </h2>
            {sessionId && (
              <span className="flex gap-3">
                <Link
                  href={`/critique?session=${sessionId}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {t("toCritique")}
                </Link>
                <Link
                  href={`/demo?session=${sessionId}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {t("toDemo")}
                </Link>
              </span>
            )}
          </div>
          <ol className="space-y-2">
            {slides.map((s) => (
              <li key={s.index} className="rounded bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
                <div className="text-neutral-500">#{s.index + 1}</div>
                <div>{s.textContent || <span className="text-neutral-400">{t("empty")}</span>}</div>
                {s.notes && (
                  <div className="mt-1 text-xs text-neutral-500">
                    {t("notes")}: {s.notes}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </form>
  );
}
