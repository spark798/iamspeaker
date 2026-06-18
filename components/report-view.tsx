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
interface Analysis {
  wpm: number;
  fillerWords: FillerWord[];
  slideTimeBreakdown: SlideTime[];
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

  if (error) return <p className="text-sm text-red-600">{error}</p>;
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
