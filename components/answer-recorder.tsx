"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

interface Feedback {
  transcript: string;
  wpm: number;
  fillerWords: { word: string; count: number }[];
  relevanceScore: number;
  improvedAnswer: string | null;
}
type Phase = "idle" | "recording" | "uploading" | "evaluating" | "done" | "error";

function pickMime(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  if (MediaRecorder.isTypeSupported("audio/webm")) return { mime: "audio/webm", ext: "webm" };
  if (MediaRecorder.isTypeSupported("audio/mp4")) return { mime: "audio/mp4", ext: "mp4" };
  return { mime: "", ext: "webm" };
}

/** 질문 1개에 대한 답변 녹음 + 평가 결과 표시. */
export function AnswerRecorder({ itemId }: { itemId: string }) {
  const t = useTranslations("qa");
  const te = useTranslations("errors");
  const [phase, setPhase] = useState<Phase>("idle");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetch(`/api/qa/${itemId}/answer`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b: Feedback | null) => {
        if (b) {
          setFeedback(b);
          setPhase("done");
        }
      })
      .catch(() => {});
  }, [itemId]);

  const upload = useCallback(
    async (blob: Blob, ext: string) => {
      setPhase("uploading");
      try {
        const fd = new FormData();
        fd.set("audio", new File([blob], `answer.${ext}`, { type: blob.type }));
        const res = await fetch(`/api/qa/${itemId}/answer`, { method: "POST", body: fd });
        if (!res.ok) throw new Error(te("uploadFailed"));
        const { jobId } = (await res.json()) as { jobId: string };
        setPhase("evaluating");
        const es = new EventSource(`/api/jobs/${jobId}/stream`);
        es.onmessage = async (ev) => {
          const d = JSON.parse(ev.data) as { status: string; error?: string | null };
          if (d.status === "succeeded") {
            es.close();
            const b = (await (await fetch(`/api/qa/${itemId}/answer`)).json()) as Feedback;
            setFeedback(b);
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
    [itemId, te],
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
  }, [t, upload]);

  const busy = phase === "uploading" || phase === "evaluating";

  return (
    <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        {phase === "recording" ? (
          <button
            type="button"
            onClick={() => recRef.current?.stop()}
            className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
          >
            ⏹ {t("stop")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            disabled={busy}
            className="rounded bg-brand px-3 py-1 text-xs font-medium text-brand-fg disabled:opacity-50"
          >
            ● {feedback ? t("retry") : t("answer")}
          </button>
        )}
        {phase === "recording" && <span className="text-xs text-red-600">● {t("recording")}</span>}
        {busy && (
          <span className="text-xs text-neutral-500">
            {phase === "uploading" ? t("uploading") : t("evaluating")}
          </span>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {feedback && phase === "done" && (
        <div className="mt-2 space-y-1 text-xs">
          <div>
            <span className="font-medium">{t("relevance")}:</span>{" "}
            {Math.round(feedback.relevanceScore * 100)}% · {t("wpm")} {feedback.wpm}
            {feedback.fillerWords.length > 0 && (
              <>
                {" "}
                · {t("fillers")} {feedback.fillerWords.reduce((n, f) => n + f.count, 0)}
              </>
            )}
          </div>
          {feedback.improvedAnswer && (
            <div className="rounded bg-brand/10 p-2">
              <span className="font-medium text-brand">{t("improved")}:</span>{" "}
              {feedback.improvedAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
