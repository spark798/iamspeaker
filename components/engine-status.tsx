"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface Engines {
  script: string;
  tts: string;
  stt: string;
}

/** 클라우드 provider 식별(나머지는 로컬). 배지 색 구분용. */
const CLOUD = new Set(["claude", "openai", "elevenlabs", "azure", "openai-whisper"]);

/**
 * 현재 활성 AI 엔진 표시(읽기 전용). 키는 .env로만 관리(셀프호스팅 원칙) — UI 입력 없음.
 * CLAUDE.md §2 "현재 동작 엔진을 UI에 명시" 충족.
 */
export function EngineStatus() {
  const t = useTranslations("engines");
  const [engines, setEngines] = useState<Engines | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((b: { engines: Engines }) => setEngines(b.engines))
      .catch(() => {});
  }, []);

  if (!engines) return null;

  const rows: [string, string][] = [
    [t("llm"), engines.script],
    [t("tts"), engines.tts],
    [t("stt"), engines.stt],
  ];

  return (
    <div className="rounded-lg border border-neutral-200 p-3 text-xs dark:border-neutral-800">
      <div className="mb-2 font-medium text-neutral-500">{t("title")}</div>
      <ul className="flex flex-wrap justify-center gap-2">
        {rows.map(([label, engine]) => {
          const cloud = CLOUD.has(engine);
          return (
            <li key={label} className="flex items-center gap-1">
              <span className="text-neutral-500">{label}</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  cloud
                    ? "bg-brand/15 text-brand"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {engine} · {cloud ? t("cloud") : t("local")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
