"use client";

import { TrendChart } from "@/components/trend-chart";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Attempt {
  recordingId: string;
  createdAt: number;
  durationSec: number;
  wpm: number | null;
  fillerCount: number | null;
}
interface MetricDelta {
  first: number;
  latest: number;
  deltaPct: number;
  improved: boolean;
}
interface BestTake {
  recordingId: string;
  value: number;
}
interface Summary {
  analyzedCount: number;
  wpm?: MetricDelta;
  fillerPerMin?: MetricDelta;
  bestFiller?: BestTake;
  bestWpm?: BestTake;
  goalMetCount: number;
  latestMeetsGoal: boolean;
  streakDays: number;
}
interface Goal {
  wpmMin: number;
  wpmMax: number;
  fillerPerMinMax: number;
}

export function ProgressView({ sessionId }: { sessionId: string }) {
  const t = useTranslations("progress");
  const te = useTranslations("errors");
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/progress`)
      .then((r) => r.json())
      .then((b: { attempts: Attempt[]; summary?: Summary; goal?: Goal }) => {
        setAttempts(b.attempts);
        setSummary(b.summary ?? null);
        setGoal(b.goal ?? null);
      })
      .catch(() => setError(te("loadFailed")));
  }, [sessionId, te]);

  if (error)
    return (
      <p role="alert" className="text-sm text-red-600">
        {error}
      </p>
    );
  if (!attempts) return <p className="text-sm text-neutral-500">{t("loading")}</p>;
  if (attempts.length === 0) return <p className="text-sm text-neutral-500">{t("noData")}</p>;

  const maxWpm = Math.max(1, ...attempts.map((a) => a.wpm ?? 0));
  // 분석 완료된 회차만 추이에 반영(대기/실패 회차 제외).
  const analyzed = attempts.filter((a) => a.wpm !== null);
  const wpmSeries = analyzed.map((a) => a.wpm as number);
  const fillerSeries = analyzed.map((a) => a.fillerCount ?? 0);

  // 첫→최신 변화를 화살표·색으로(개선=초록). 필러는 낮을수록, WPM은 목표 근접이 개선.
  const deltaRow = (label: string, d: MetricDelta, unit: string) => (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-neutral-500">{label}</span>
      <span className="tabular-nums">
        {d.first}
        {unit} <span className="text-neutral-400">→</span> {d.latest}
        {unit}
      </span>
      <span className={d.improved ? "text-green-600" : "text-red-600"}>
        {d.improved ? "▲" : "▽"} {Math.round(d.deltaPct * 100)}%
      </span>
    </div>
  );

  return (
    <div className="mt-4 space-y-6">
      {summary && summary.analyzedCount > 0 && goal && (
        <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{t("summaryTitle")}</h2>
            {summary.streakDays >= 2 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                🔥 {t("streak", { days: summary.streakDays })}
              </span>
            )}
          </div>

          {(summary.fillerPerMin || summary.wpm) && (
            <div className="space-y-1">
              {summary.fillerPerMin && deltaRow(t("fillers"), summary.fillerPerMin, "/m")}
              {summary.wpm && deltaRow(t("wpm"), summary.wpm, "")}
              <p className="text-xs text-neutral-400">{t("vsFirst")}</p>
            </div>
          )}

          <p className="text-sm">
            {t("goalLine", {
              min: goal.wpmMin,
              max: goal.wpmMax,
              filler: goal.fillerPerMinMax,
            })}{" "}
            ·{" "}
            <span className={summary.latestMeetsGoal ? "text-green-600" : "text-neutral-500"}>
              {summary.latestMeetsGoal ? t("latestOk") : t("latestNo")}
            </span>{" "}
            · {t("goalMet", { met: summary.goalMetCount, total: summary.analyzedCount })}
          </p>

          {(summary.bestFiller || summary.bestWpm) && (
            <p className="text-sm text-neutral-500">
              {t("best")}:{" "}
              {summary.bestFiller && (
                <Link
                  href={`/report?recording=${summary.bestFiller.recordingId}`}
                  className="text-brand hover:underline"
                >
                  {t("fillers")} {summary.bestFiller.value}/m
                </Link>
              )}
              {summary.bestFiller && summary.bestWpm && " · "}
              {summary.bestWpm && (
                <Link
                  href={`/report?recording=${summary.bestWpm.recordingId}`}
                  className="text-brand hover:underline"
                >
                  {t("wpm")} {summary.bestWpm.value}
                </Link>
              )}
            </p>
          )}
        </div>
      )}

      {analyzed.length >= 2 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <TrendChart values={wpmSeries} band={[110, 150]} label={t("wpmTrend")} />
          <TrendChart values={fillerSeries} color="#d97706" label={t("fillerTrend")} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
              <th className="py-2">{t("attempt")}</th>
              <th className="py-2">{t("wpm")}</th>
              <th className="py-2">{t("fillers")}</th>
              <th className="py-2">{t("duration")}</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a, i) => (
              <tr
                key={a.recordingId}
                className="border-b border-neutral-100 dark:border-neutral-900"
              >
                <td className="py-2">#{i + 1}</td>
                <td className="py-2">
                  {a.wpm === null ? (
                    <span className="text-neutral-400">{t("pending")}</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 rounded bg-brand"
                        style={{ width: `${(a.wpm / maxWpm) * 80}px` }}
                      />
                      {a.wpm}
                    </span>
                  )}
                </td>
                <td className="py-2">{a.fillerCount ?? "—"}</td>
                <td className="py-2 text-neutral-500">
                  <Link href={`/report?recording=${a.recordingId}`} className="hover:underline">
                    {Math.round(a.durationSec)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
