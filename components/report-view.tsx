"use client";

import { RangeGauge, RingGauge } from "@/components/report-charts";
import { cuePrincipleSource } from "@/lib/ai/rhetoric/principles";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

/** 0~100 점수 → 신호색 클래스(text-* — gauge stroke/숫자 공용). */
function scoreColorClass(score: number): string {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-amber-500";
  return "text-red-600";
}

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
  kind:
    | "pace_fast"
    | "pace_slow"
    | "time_long"
    | "time_short"
    | "filler"
    | "monotone"
    | "risk"
    | "intonation";
  value?: number;
  text?: string;
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
  const wpmZoneMin = data.goal?.wpmMin ?? 110;
  const wpmZoneMax = data.goal?.wpmMax ?? 150;
  const wpmOk = data.wpm >= wpmZoneMin && data.wpm <= wpmZoneMax;
  const maxSlide = Math.max(1, ...data.slideTimeBreakdown.map((s) => s.durationSec));
  // 전달 점수(헤드라인) = 측정 지표 점수들의 평균(0~100). 아래 지표별 막대가 근거를 보여줌.
  const deliveryScore =
    data.scores.length > 0
      ? Math.round(data.scores.reduce((sum, s) => sum + s.score, 0) / data.scores.length)
      : null;

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
                  {t(`cue_${c.kind}`, {
                    slide: c.slideIndex + 1,
                    value: c.value ?? 0,
                    text: c.text ?? "",
                  })}
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

      {/* 헤드라인 게이지 카드 — WPM·발음·전달점수를 한눈에(Pillar ②: 직관적 진척). */}
      <div id="reportGauges" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="text-xs font-medium text-neutral-500">{t("wpm")}</div>
          <div
            className={`mt-1 text-3xl font-bold tabular-nums ${wpmOk ? "text-green-600" : "text-amber-500"}`}
          >
            {data.wpm}
          </div>
          <div className="mt-3">
            <RangeGauge
              value={data.wpm}
              axisMin={60}
              axisMax={220}
              zoneMin={wpmZoneMin}
              zoneMax={wpmZoneMax}
              inZone={wpmOk}
              ariaLabel={t("wpmGoalHint", { min: wpmZoneMin, max: wpmZoneMax })}
            />
            <div className="mt-1 flex justify-between text-[10px] tabular-nums text-neutral-400">
              <span>60</span>
              <span>220</span>
            </div>
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {data.goal ? t("wpmGoalHint", { min: wpmZoneMin, max: wpmZoneMax }) : t("wpmHint")}
          </div>
        </div>

        {data.pronunciationScore != null && (
          <div className="flex items-center gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <RingGauge
              value={data.pronunciationScore}
              colorClass={scoreColorClass(data.pronunciationScore)}
              ariaLabel={`${t("pronunciation")} ${data.pronunciationScore}/100`}
            />
            <div className="min-w-0">
              <div className="text-xs font-medium text-neutral-500">{t("pronunciation")}</div>
              <div className="text-xs text-neutral-400">/ 100</div>
              <div className="mt-1 text-xs text-neutral-500">{t("pronScoreHint")}</div>
            </div>
          </div>
        )}

        {deliveryScore != null && (
          <div className="flex items-center gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <RingGauge
              value={deliveryScore}
              colorClass={scoreColorClass(deliveryScore)}
              ariaLabel={`${t("deliveryScore")} ${deliveryScore}/100`}
            />
            <div className="min-w-0">
              <div className="text-xs font-medium text-neutral-500">{t("deliveryScore")}</div>
              <div className="mt-1 text-xs text-neutral-500">{t("deliveryScoreHint")}</div>
            </div>
          </div>
        )}
      </div>

      {data.scores.length > 0 && (
        <div>
          <h2 className="mb-1 font-medium">{t("scoreTitle")}</h2>
          <p className="mb-2 text-xs text-neutral-500">{t("scoreHint")}</p>
          <ul className="space-y-2">
            {data.scores.map((s) => {
              const color = scoreColorClass(s.score);
              const barBg =
                s.score >= 75 ? "bg-green-500" : s.score >= 50 ? "bg-amber-500" : "bg-red-500";
              return (
                <li key={s.metric} className="flex items-center gap-3 text-sm">
                  <span className="w-28 text-neutral-500">{t(`metric_${s.metric}`)}</span>
                  <span className="w-12 tabular-nums">{s.value}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                    <div className={`h-full ${barBg}`} style={{ width: `${s.score}%` }} />
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
