"use client";

import { cuePrincipleSource } from "@/lib/ai/rhetoric/principles";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

interface FillerWord {
  word: string;
  count: number;
  timestamps: number[];
}
interface SlideTime {
  slideIndex: number;
  durationSec: number;
}
interface PhonemeScore {
  ph: string;
  ok: boolean;
}
interface PronIssue {
  word: string;
  expectedSound: string;
  confidence: number;
  l1Related: boolean;
  phonemes?: PhonemeScore[];
}
interface MetricScore {
  metric: string;
  value: number;
  score: number;
  band: "ideal" | "low" | "high";
}
interface Cue {
  slideIndex: number;
  kind: "pace_fast" | "pace_slow" | "time_long" | "time_short" | "filler";
  value?: number;
}
interface Goal {
  wpmMin: number;
  wpmMax: number;
  fillerPerMinMax: number;
}
interface Analysis {
  sessionId: string | null;
  wpm: number;
  fillerWords: FillerWord[];
  slideTimeBreakdown: SlideTime[];
  pronunciationIssues: PronIssue[];
  pronunciationScore: number | null;
  scores: MetricScore[];
  cues: Cue[];
  goal?: Goal;
}

export function ReportView({ recordingId }: { recordingId: string }) {
  const t = useTranslations("report");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/recordings/${recordingId}/analysis`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((b: Analysis) => setData(b))
      .catch(() => setError(te("loadFailed")));
  }, [recordingId, te]);

  if (error)
    return (
      <p role="alert" className="text-sm text-red-600">
        {error}
      </p>
    );
  if (!data) return <p className="text-sm text-neutral-500">{t("loading")}</p>;

  // WPM 헤드라인 색은 해석된 목표(장르·비원어민·사용자지정) 기준 — 하드코딩 밴드 제거.
  const wpmOk = data.goal
    ? data.wpm >= data.goal.wpmMin && data.wpm <= data.goal.wpmMax
    : data.wpm >= 110 && data.wpm <= 150;
  const maxSlide = Math.max(1, ...data.slideTimeBreakdown.map((s) => s.durationSec));

  return (
    <div className="mt-4 space-y-6">
      {/* PDF 인쇄 시에만 보이는 브랜드 헤더(화면에선 숨김). */}
      <div className="hidden border-b border-neutral-300 pb-2 print:block">
        <span className="text-base font-bold">iamspeaker — {t("title")}</span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-4 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="text-sm font-medium text-brand hover:underline"
        >
          {t("exportPdf")}
        </button>
        <Link
          href={`/improve?recording=${recordingId}`}
          className="text-sm font-medium text-brand hover:underline"
        >
          {t("toImprove")}
        </Link>
        {data.sessionId && (
          <Link
            href={`/record?session=${data.sessionId}`}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
          >
            {tc("practiceAgain")}
          </Link>
        )}
      </div>

      {/* 처방적 코칭 노트 — 어느 슬라이드에서 무엇을(행동). 코치의 헤드라인 가치. */}
      <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
        <h2 className="mb-2 font-medium">{t("cueTitle")}</h2>
        {data.cues.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("cueNone")}</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.cues.map((c, i) => (
              <li key={`${c.slideIndex}-${c.kind}-${i}`} className="flex items-start gap-2">
                <span className="text-brand">▸</span>
                <span>
                  {t(`cue_${c.kind}`, { slide: c.slideIndex + 1, value: c.value ?? 0 })}
                  {/* 전문가 원칙 팁 + 출처(명저 귀속). */}
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {t(`cueTip_${c.kind}`)}{" "}
                    <span className="text-neutral-400">— {cuePrincipleSource(c.kind)}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="text-xs font-medium text-neutral-500">{t("wpm")}</div>
        <div className={`text-3xl font-bold ${wpmOk ? "text-green-600" : "text-amber-600"}`}>
          {data.wpm}
        </div>
        <div className="text-xs text-neutral-500">
          {data.goal
            ? t("wpmGoalHint", { min: data.goal.wpmMin, max: data.goal.wpmMax })
            : t("wpmHint")}
        </div>
      </div>

      {data.scores.length > 0 && (
        <div>
          <h2 className="mb-1 font-medium">{t("scoreTitle")}</h2>
          <p className="mb-2 text-xs text-neutral-500">{t("scoreHint")}</p>
          <ul className="space-y-2">
            {data.scores.map((s) => {
              const color =
                s.band === "ideal"
                  ? "text-green-600"
                  : s.score >= 60
                    ? "text-amber-600"
                    : "text-red-600";
              return (
                <li key={s.metric} className="flex items-center gap-3 text-sm">
                  <span className="w-28 text-neutral-500">{t(`metric_${s.metric}`)}</span>
                  <span className="w-12 tabular-nums">{s.value}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className={`h-full ${s.band === "ideal" ? "bg-green-500" : "bg-amber-500"}`}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                  <span className={`w-20 text-right font-medium ${color}`}>
                    {s.score} · {t(`band_${s.band}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-medium">{t("fillers")}</h2>
        {data.fillerWords.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("fillerNone")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {data.fillerWords.map((f) => (
              <li
                key={f.word}
                className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
              >
                {f.word} × {f.count}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-medium">{t("pronunciation")}</h2>
        {data.pronunciationScore != null && (
          <div className="mb-3 flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums">{data.pronunciationScore}</span>
            <span className="text-xs text-neutral-500">/ 100 · {t("pronScoreHint")}</span>
          </div>
        )}
        {data.pronunciationIssues.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("pronNone")}</p>
        ) : (
          <>
            {data.pronunciationIssues.some((p) => p.phonemes && p.phonemes.length > 0) && (
              <p className="mb-2 text-xs text-neutral-500">{t("pronPhonemeLegend")}</p>
            )}
            <ul className="space-y-1.5 text-sm">
              {data.pronunciationIssues.map((p) => (
                <li key={`${p.word}-${p.confidence}`} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.word}</span>
                  <span className="tabular-nums text-xs text-neutral-400">
                    {Math.round(p.confidence * 100)}%
                  </span>
                  {p.phonemes && p.phonemes.length > 0 && (
                    <span className="flex flex-wrap gap-0.5">
                      {p.phonemes.map((ph, i) => (
                        <span
                          // biome-ignore lint/suspicious/noArrayIndexKey: 음소 시퀀스 순서 고정
                          key={i}
                          className={`rounded px-1 font-mono text-xs ${
                            ph.ok
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                          }`}
                        >
                          {ph.ph}
                        </span>
                      ))}
                    </span>
                  )}
                  {p.l1Related && (
                    <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">
                      {t("l1Badge")}
                    </span>
                  )}
                  <span className="text-neutral-500">{p.expectedSound}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {data.slideTimeBreakdown.length > 0 && (
        <div>
          <h2 className="mb-2 font-medium">{t("slideTime")}</h2>
          <ul className="space-y-1">
            {data.slideTimeBreakdown.map((s) => (
              <li key={s.slideIndex} className="flex items-center gap-2 text-sm">
                <span className="w-16 text-neutral-500">#{s.slideIndex + 1}</span>
                <span
                  className="inline-block h-3 rounded bg-brand"
                  style={{ width: `${(s.durationSec / maxSlide) * 100}%` }}
                />
                <span className="text-neutral-500">{s.durationSec}s</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
