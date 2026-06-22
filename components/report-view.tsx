"use client";

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
interface PronIssue {
  word: string;
  expectedSound: string;
  confidence: number;
  l1Related: boolean;
}
interface MetricScore {
  metric: string;
  value: number;
  score: number;
  band: "ideal" | "low" | "high";
}
interface Analysis {
  wpm: number;
  fillerWords: FillerWord[];
  slideTimeBreakdown: SlideTime[];
  pronunciationIssues: PronIssue[];
  scores: MetricScore[];
}

export function ReportView({ recordingId }: { recordingId: string }) {
  const t = useTranslations("report");
  const te = useTranslations("errors");
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

  const wpmOk = data.wpm >= 110 && data.wpm <= 150;
  const maxSlide = Math.max(1, ...data.slideTimeBreakdown.map((s) => s.durationSec));

  return (
    <div className="mt-4 space-y-6">
      <div className="flex justify-end">
        <Link
          href={`/improve?recording=${recordingId}`}
          className="text-sm font-medium text-brand hover:underline"
        >
          {t("toImprove")}
        </Link>
      </div>
      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="text-xs font-medium text-neutral-500">{t("wpm")}</div>
        <div className={`text-3xl font-bold ${wpmOk ? "text-green-600" : "text-amber-600"}`}>
          {data.wpm}
        </div>
        <div className="text-xs text-neutral-500">{t("wpmHint")}</div>
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
        {data.pronunciationIssues.length === 0 ? (
          <p className="text-sm text-neutral-500">{t("pronNone")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.pronunciationIssues.map((p) => (
              <li key={`${p.word}-${p.confidence}`} className="flex items-start gap-2">
                <span className="font-medium">{p.word}</span>
                {p.l1Related && (
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">
                    {t("l1Badge")}
                  </span>
                )}
                <span className="text-neutral-500">{p.expectedSound}</span>
              </li>
            ))}
          </ul>
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
