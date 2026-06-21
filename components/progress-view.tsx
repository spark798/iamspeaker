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

export function ProgressView({ sessionId }: { sessionId: string }) {
  const t = useTranslations("progress");
  const te = useTranslations("errors");
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/progress`)
      .then((r) => r.json())
      .then((b: { attempts: Attempt[] }) => setAttempts(b.attempts))
      .catch(() => setError(te("loadFailed")));
  }, [sessionId, te]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!attempts) return <p className="text-sm text-neutral-500">{t("loading")}</p>;
  if (attempts.length === 0) return <p className="text-sm text-neutral-500">{t("noData")}</p>;

  const maxWpm = Math.max(1, ...attempts.map((a) => a.wpm ?? 0));
  // 분석 완료된 회차만 추이에 반영(대기/실패 회차 제외).
  const analyzed = attempts.filter((a) => a.wpm !== null);
  const wpmSeries = analyzed.map((a) => a.wpm as number);
  const fillerSeries = analyzed.map((a) => a.fillerCount ?? 0);

  return (
    <div className="mt-4 space-y-6">
      {analyzed.length >= 2 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <TrendChart values={wpmSeries} band={[110, 150]} label={t("wpmTrend")} />
          <TrendChart values={fillerSeries} color="#d97706" label={t("fillerTrend")} />
        </div>
      )}

      <table className="w-full text-sm">
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
            <tr key={a.recordingId} className="border-b border-neutral-100 dark:border-neutral-900">
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
  );
}
