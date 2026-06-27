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
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((b: { sessions: SessionRow[] }) => setSessions(b.sessions))
      .catch(() => setSessions([]));
  }, []);

  const del = async (id: string) => {
    if (!window.confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (res.ok) setSessions((cur) => (cur ? cur.filter((s) => s.id !== id) : cur));
  };

  if (!sessions || sessions.length === 0) return null;

  // 라벨 + 장르 라벨로 검색(클라이언트 필터).
  const q = query.trim().toLowerCase();
  const filtered = q
    ? sessions.filter((s) =>
        `${s.slideFileName ?? t("untitled")} ${tu(GENRE_KEY[s.genre])}`.toLowerCase().includes(q),
      )
    : sessions;

  return (
    <div className="w-full space-y-2 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium text-neutral-500">{t("title")}</h2>
        {sessions.length > 5 && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">{t("noMatches")}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
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
                  {s.lastPracticedAt
                    ? ` · ${new Date(s.lastPracticedAt).toLocaleDateString()}`
                    : ""}
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
                <button
                  type="button"
                  onClick={() => void del(s.id)}
                  className="text-neutral-400 hover:text-red-600"
                  aria-label={t("delete")}
                >
                  {t("delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
