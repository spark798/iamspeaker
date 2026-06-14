"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

/** 발표 연습 플로우 단계 (스토리보드 순서). id = 라우트 세그먼트 + i18n 키. */
export const STEPS = [
  { id: "upload", scr: "SCR-01" },
  { id: "critique", scr: "SCR-01b" },
  { id: "demo", scr: "SCR-02" },
  { id: "editor", scr: "SCR-03" },
  { id: "record", scr: "SCR-04" },
  { id: "report", scr: "SCR-05" },
  { id: "improve", scr: "SCR-06" },
  { id: "qa", scr: "SCR-08" },
  { id: "progress", scr: "SCR-07" },
] as const;

/** 현재 라우트에 해당하는 단계를 강조하는 진행 스테퍼(표시 전용, 접근성 라벨 포함). */
export function Stepper() {
  const t = useTranslations("stepper");
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => pathname.startsWith(`/${s.id}`));

  return (
    <nav aria-label="발표 연습 단계">
      <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {STEPS.map((step, i) => {
          const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
          return (
            <li
              key={step.id}
              aria-current={state === "current" ? "step" : undefined}
              className="flex items-center gap-2"
            >
              <span
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  state === "current"
                    ? "bg-brand text-brand-fg"
                    : state === "done"
                      ? "bg-brand/15 text-brand"
                      : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800",
                ].join(" ")}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={
                  state === "current"
                    ? "font-medium text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500"
                }
              >
                {t(step.id)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
