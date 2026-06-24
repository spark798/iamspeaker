"use client";

import { errorKeyForStatus } from "@/lib/api/error-key";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface Slide {
  index: number;
  textContent: string;
}
interface SlideScript {
  slideIndex: number;
  text: string;
}
interface Transition {
  slideIndex: number;
  atSec: number;
}
type Phase = "idle" | "recording" | "uploading" | "analyzing" | "done" | "error";

function pickMime(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  if (MediaRecorder.isTypeSupported("audio/webm")) return { mime: "audio/webm", ext: "webm" };
  if (MediaRecorder.isTypeSupported("audio/mp4")) return { mime: "audio/mp4", ext: "mp4" };
  return { mime: "", ext: "webm" };
}

export function Recorder({ sessionId }: { sessionId: string }) {
  const t = useTranslations("record");
  const te = useTranslations("errors");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [scripts, setScripts] = useState<Record<number, string>>({});
  const [scriptVersion, setScriptVersion] = useState(0);
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const transitionsRef = useRef<Transition[]>([]);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/slides`)
      .then((r) => r.json())
      .then((b: { slides: Slide[] }) => setSlides(b.slides))
      .catch(() => setError(te("loadFailed")));
    fetch(`/api/sessions/${sessionId}/script`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { version: number; content: SlideScript[] } | null) => {
        if (!b) return;
        setScriptVersion(b.version);
        const m: Record<number, string> = {};
        for (const c of b.content) m[c.slideIndex] = c.text;
        setScripts(m);
      })
      .catch(() => {});
  }, [sessionId, te]);

  const elapsed = () => (Date.now() - startRef.current) / 1000;

  // 녹음 중 경과 시간 라이브 갱신(페이싱 보조). startRef는 ref라 안정적.
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => setElapsedSec((Date.now() - startRef.current) / 1000), 250);
    return () => clearInterval(id);
  }, [phase]);

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const goTo = (index: number) => {
    if (index < 0 || index >= slides.length) return;
    if (phase === "recording") transitionsRef.current.push({ slideIndex: index, atSec: elapsed() });
    setCurrent(index);
  };

  const upload = useCallback(
    async (blob: Blob, ext: string) => {
      setPhase("uploading");
      try {
        const fd = new FormData();
        fd.set("audio", new File([blob], `recording.${ext}`, { type: blob.type }));
        fd.set("scriptVersion", String(scriptVersion));
        fd.set("transitions", JSON.stringify(transitionsRef.current));
        const res = await fetch(`/api/sessions/${sessionId}/recordings`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error(te(errorKeyForStatus(res.status) ?? "uploadFailed"));
        const { recordingId: rid, jobId } = (await res.json()) as {
          recordingId: string;
          jobId: string;
        };
        setPhase("analyzing");
        const es = new EventSource(`/api/jobs/${jobId}/stream`);
        es.onmessage = (ev) => {
          const d = JSON.parse(ev.data) as { status: string; error?: string | null };
          if (d.status === "succeeded") {
            es.close();
            setRecordingId(rid);
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
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    },
    [sessionId, scriptVersion, te],
  );

  const start = useCallback(async () => {
    const picked = pickMime();
    if (!picked) {
      setError(t("noMic"));
      setPhase("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = picked.mime
        ? new MediaRecorder(stream, { mimeType: picked.mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      transitionsRef.current = [{ slideIndex: current, atSec: 0 }];
      startRef.current = Date.now();
      setElapsedSec(0);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        for (const tr of stream.getTracks()) tr.stop();
        void upload(new Blob(chunksRef.current, { type: picked.mime || "audio/webm" }), picked.ext);
      };
      recRef.current = rec;
      rec.start();
      setError(null);
      setPhase("recording");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [current, t, upload]);

  const stop = () => recRef.current?.stop();

  const busy = phase === "uploading" || phase === "analyzing";
  const slide = slides[current];

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {phase === "recording" ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <span aria-hidden="true">⏹ </span>
            {t("stop")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            disabled={busy}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
          >
            <span aria-hidden="true">● </span>
            {t("start")}
          </button>
        )}
        {phase === "recording" && (
          <span className="flex items-center gap-2 text-sm text-red-600" aria-live="polite">
            <span>
              <span aria-hidden="true">● </span>
              {t("recording")}
            </span>
            <span className="tabular-nums font-medium">{fmtTime(elapsedSec)}</span>
          </span>
        )}
        {busy && (
          <span className="text-sm text-neutral-500" aria-live="polite">
            {phase === "uploading" ? t("uploading") : t("analyzing")}
          </span>
        )}
        {phase === "done" && recordingId && (
          <Link
            href={`/report?recording=${recordingId}`}
            className="ml-auto text-sm font-medium text-brand hover:underline"
          >
            {t("toReport")}
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {slide && (
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">
              {t("slide")} {current + 1} / {slides.length}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => goTo(current - 1)}
                disabled={current === 0}
                className="rounded border px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
              >
                ← {t("prev")}
              </button>
              <button
                type="button"
                onClick={() => goTo(current + 1)}
                disabled={current >= slides.length - 1}
                className="rounded border px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
              >
                {t("next")} →
              </button>
            </span>
          </div>
          <div className="text-sm text-neutral-500">{slide.textContent}</div>
          {scripts[current] && <p className="mt-3 text-sm">{scripts[current]}</p>}
        </div>
      )}
    </div>
  );
}
