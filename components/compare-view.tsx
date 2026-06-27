"use client";

import { type CueChange, compareCues, compareScores, cueCategory } from "@/lib/analysis/compare";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface FillerWord {
  word: string;
  count: number;
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
interface Analysis {
  durationSec: number;
  wpm: number;
  fillerWords: FillerWord[];
  pronunciationScore: number | null;
  scores: MetricScore[];
  cues: Cue[];
}

const STATUS_STYLE: Record<CueChange["status"], string> = {
  resolved: "text-green-600",
  persisting: "text-neutral-500",
  new: "text-red-600",
};

const totalFillers = (a: Analysis) => a.fillerWords.reduce((n, f) => n + f.count, 0);

/** 개선 방향 화살표·색. lowerBetter면 감소가 개선. */
function Delta({ delta, lowerBetter = false }: { delta: number | null; lowerBetter?: boolean }) {
  if (delta === null || delta === 0) return <span className="text-neutral-400">–</span>;
  const improved = lowerBetter ? delta < 0 : delta > 0;
  return (
    <span className={improved ? "text-green-600" : "text-red-600"}>
      {delta > 0 ? "+" : ""}
      {delta} {improved ? "▲" : "▽"}
    </span>
  );
}

export function CompareView({ a, b }: { a: string; b: string }) {
  const t = useTranslations("compare");
  const tr = useTranslations("report");
  const te = useTranslations("errors");
  const [data, setData] = useState<[Analysis, Analysis] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const get = (id: string): Promise<Analysis> =>
      fetch(`/api/recordings/${id}/analysis`).then((r) =>
        r.ok ? (r.json() as Promise<Analysis>) : Promise.reject(new Error("not found")),
      );
    Promise.all([get(a), get(b)])
      .then((pair) => setData(pair))
      .catch(() => setError(te("loadFailed")));
  }, [a, b, te]);

  if (error)
    return (
      <p role="alert" className="text-sm text-red-600">
        {error}
      </p>
    );
  if (!data) return <p className="text-sm text-neutral-500">{t("loading")}</p>;
  const [A, B] = data;
  const pairs = compareScores(A.scores, B.scores);
  const cueChanges = compareCues(A.cues ?? [], B.cues ?? []);

  const headline = (label: string, av: number | null, bv: number | null, lowerBetter = false) => (
    <tr className="border-b border-neutral-100 dark:border-neutral-900">
      <td className="py-2 text-neutral-500">{label}</td>
      <td className="py-2 text-right tabular-nums">{av ?? "–"}</td>
      <td className="py-2 text-right tabular-nums">{bv ?? "–"}</td>
      <td className="py-2 text-right tabular-nums">
        <Delta
          delta={av !== null && bv !== null ? Math.round((bv - av) * 10) / 10 : null}
          lowerBetter={lowerBetter}
        />
      </td>
    </tr>
  );

  return (
    <div className="mt-4 space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[24rem] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-800">
              <th className="py-2 text-left">{t("metric")}</th>
              <th className="py-2 text-right">{t("takeA")}</th>
              <th className="py-2 text-right">{t("takeB")}</th>
              <th className="py-2 text-right">{t("delta")}</th>
            </tr>
          </thead>
          <tbody>
            {headline(t("pronScore"), A.pronunciationScore, B.pronunciationScore)}
            {headline(t("wpm"), A.wpm, B.wpm)}
            {headline(t("fillers"), totalFillers(A), totalFillers(B), true)}
            {headline(t("duration"), Math.round(A.durationSec), Math.round(B.durationSec))}
          </tbody>
        </table>
      </div>

      {pairs.length > 0 && (
        <div className="overflow-x-auto">
          <h2 className="mb-2 font-medium">{t("scoreTitle")}</h2>
          <table className="w-full min-w-[24rem] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-800">
                <th className="py-2 text-left">{t("metric")}</th>
                <th className="py-2 text-right">{t("takeA")}</th>
                <th className="py-2 text-right">{t("takeB")}</th>
                <th className="py-2 text-right">{t("delta")}</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.metric} className="border-b border-neutral-100 dark:border-neutral-900">
                  <td className="py-2 text-neutral-500">{tr(`metric_${p.metric}`)}</td>
                  <td className="py-2 text-right tabular-nums">{p.a ?? "–"}</td>
                  <td className="py-2 text-right tabular-nums">{p.b ?? "–"}</td>
                  <td className="py-2 text-right tabular-nums">
                    <Delta delta={p.delta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-neutral-400">{t("scoreHint")}</p>
        </div>
      )}

      {/* 슬라이드별 처방 코칭 노트의 변화 — 무엇이 개선/지속/신규인지. */}
      {cueChanges.length > 0 && (
        <div>
          <h2 className="mb-2 font-medium">{t("cueChangeTitle")}</h2>
          <ul className="space-y-1 text-sm">
            {cueChanges.map((c, i) => (
              <li key={`${c.slideIndex}-${c.kind}-${i}`} className="flex items-start gap-2">
                <span className={STATUS_STYLE[c.status]}>
                  {c.status === "resolved" ? "✓" : c.status === "new" ? "▸" : "·"}
                </span>
                <span>
                  {t("cueChangeLine", {
                    slide: c.slideIndex + 1,
                    cat: t(`cueCat_${cueCategory(c.kind)}`),
                    status: t(`cueStatus_${c.status}`),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
