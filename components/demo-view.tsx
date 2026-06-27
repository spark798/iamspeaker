"use client";

import { errorKeyForStatus } from "@/lib/api/error-key";
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

/** 데모 음성 선택 기억용 localStorage 키. */
const VOICE_PREF_KEY = "iamspeaker.demoVoice";

export function DemoView({ sessionId }: { sessionId: string }) {
  const t = useTranslations("demo");
  const te = useTranslations("errors");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [script, setScript] = useState<SlideScript[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translation, setTranslation] = useState<Map<number, string> | null>(null);
  const [translating, setTranslating] = useState(false);
  const [audioErr, setAudioErr] = useState<Set<number>>(new Set());
  // 선택한 음성은 localStorage에 저장 → 다음에도 같은 음성이 기본값(로컬 우선, 서버 불필요).
  // SSR 하이드레이션 불일치 방지를 위해 초기값은 female, 마운트 후 저장된 선호를 적용.
  const [voice, setVoice] = useState<"female" | "male">("female");
  useEffect(() => {
    if (window.localStorage.getItem(VOICE_PREF_KEY) === "male") setVoice("male");
  }, []);

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
      if (!res.ok) throw new Error(te(errorKeyForStatus(res.status) ?? "demoFailed"));
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

  const toggleTranslation = useCallback(async () => {
    if (translation) {
      setTranslation(null);
      return;
    }
    setTranslating(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/translation`);
      if (res.status === 204) {
        setTranslation(new Map()); // 번역 불필요(모국어=발표 언어)
        return;
      }
      if (!res.ok) throw new Error(te("loadFailed"));
      const b = (await res.json()) as { content: SlideScript[] };
      setTranslation(new Map(b.content.map((c) => [c.slideIndex, c.text])));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  }, [sessionId, translation, te]);

  const scriptByIndex = new Map(script.map((s) => [s.slideIndex, s.text]));
  const hasScript = script.length > 0;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm font-medium">
              <span className="text-neutral-500">{t("voiceLabel")}</span>
              <select
                value={voice}
                onChange={(e) => {
                  const next = e.target.value as "female" | "male";
                  setVoice(next);
                  window.localStorage.setItem(VOICE_PREF_KEY, next); // 다음 방문의 기본값으로 기억
                  setAudioErr(new Set()); // 음성 변경 시 이전 실패 상태 초기화
                }}
                className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="female">{t("voiceFemale")}</option>
                <option value="male">{t("voiceMale")}</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void toggleTranslation()}
              disabled={translating}
              className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
            >
              {translating
                ? t("translating")
                : translation
                  ? t("hideTranslation")
                  : t("showTranslation")}
            </button>
            <a
              href={`/api/sessions/${sessionId}/subtitle`}
              className="text-sm font-medium text-brand hover:underline"
            >
              {t("downloadSrt")}
            </a>
            <Link
              href={`/editor?session=${sessionId}`}
              className="text-sm font-medium text-brand hover:underline"
            >
              {t("toEditor")}
            </Link>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
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
                {translation?.has(s.index) && (
                  <p className="mt-1 border-l-2 border-brand/40 pl-2 text-sm text-neutral-500">
                    {translation.get(s.index)}
                  </p>
                )}
                <div className="mt-2">
                  <div className="mb-1 text-xs text-neutral-500">{t("listen")}</div>
                  {audioErr.has(s.index) ? (
                    <p className="text-xs text-amber-600">{t("audioUnavailable")}</p>
                  ) : (
                    <audio
                      key={voice}
                      controls
                      preload="none"
                      className="h-8 w-full max-w-md"
                      src={`/api/sessions/${sessionId}/demo-audio?slide=${s.index}&voice=${voice}`}
                      onError={() => setAudioErr((prev) => new Set(prev).add(s.index))}
                    >
                      <track kind="captions" />
                    </audio>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
