"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SessionRow {
  id: string;
  createdAt: number;
  genre: "talk" | "pitch" | "lecture";
  targetDurationSec: number;
  slideFileName: string | null;
  recordingCount: number;
  lastPracticedAt: number | null;
}

const GENRE_KEY: Record<SessionRow["genre"], "genreTalk" | "genrePitch" | "genreLecture"> = {
  talk: "genreTalk",
  pitch: "genrePitch",
  lecture: "genreLecture",
};

/** 대시보드: 내 발표(세션) 목록 — 회차 수·마지막 연습일, 열기/기록 링크. */
export function SessionList() {
  const t = useTranslations("dashboard");
  const tu = useTranslations("uploadForm");
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((b: { sessions: SessionRow[] }) => setSessions(b.sessions))
      .catch(() => setSessions([]));
  }, []);

  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="w-full space-y-2 text-left">
      <h2 className="font-medium text-neutral-500">{t("title")}</h2>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <div className="min-w-0">
              <Link href={`/demo?session=${s.id}`} className="font-medium hover:underline">
                {s.slideFileName ?? t("untitled")}
              </Link>
              <div className="text-xs text-neutral-500">
                {tu(GENRE_KEY[s.genre])} · {Math.round(s.targetDurationSec / 60)}m ·{" "}
                {t("takes", { count: s.recordingCount })}
                {s.lastPracticedAt ? ` · ${new Date(s.lastPracticedAt).toLocaleDateString()}` : ""}
              </div>
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              <Link href={`/demo?session=${s.id}`} className="text-brand hover:underline">
                {t("open")}
              </Link>
              {s.recordingCount > 0 && (
                <Link href={`/progress?session=${s.id}`} className="text-brand hover:underline">
                  {t("history")}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
