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
interface Llm {
  engine: string;
  model?: string;
  reachable: boolean;
  smallModel?: boolean;
}

export function EngineStatus() {
  const t = useTranslations("engines");
  const [engines, setEngines] = useState<Engines | null>(null);
  const [llm, setLlm] = useState<Llm | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((b: { engines: Engines; llm?: Llm }) => {
        setEngines(b.engines);
        setLlm(b.llm ?? null);
      })
      .catch(() => {});
  }, []);

  if (!engines) return null;

  const reachable = llm?.reachable ?? true;
  // LLM 행은 모델명을 함께 표기(예: ollama · llama3.1:8b). cloud 배지 색은 raw engine 키로 판정.
  const rows: { label: string; engineKey: string; display: string }[] = [
    {
      label: t("llm"),
      engineKey: engines.script,
      display: llm?.model ? `${engines.script} · ${llm.model}` : engines.script,
    },
    { label: t("tts"), engineKey: engines.tts, display: engines.tts },
    { label: t("stt"), engineKey: engines.stt, display: engines.stt },
  ];

  return (
    <div className="rounded-lg border border-neutral-200 p-3 text-xs dark:border-neutral-800">
      <div className="mb-2 font-medium text-neutral-500">{t("title")}</div>
      <ul className="flex flex-wrap justify-center gap-2">
        {rows.map(({ label, engineKey, display }) => {
          const cloud = CLOUD.has(engineKey);
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
                {display} · {cloud ? t("cloud") : t("local")}
              </span>
            </li>
          );
        })}
      </ul>
      {!reachable && (
        <p role="alert" className="mt-2 text-amber-600">
          {t("unreachable")}
        </p>
      )}
      {reachable && llm?.smallModel && <p className="mt-2 text-neutral-500">{t("qualityHint")}</p>}
    </div>
  );
}
