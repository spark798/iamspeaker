"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";

/** UI 로케일 라벨(각 언어 자체 표기). request.ts SUPPORTED_LOCALES와 일치. */
const LOCALES: { code: string; label: string }[] = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

/** 쿠키에 로케일을 저장하고 새로고침해 적용(URL 라우팅 없는 방식). */
export function LocaleSwitcher() {
  const current = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Language"
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        // 1년 유지. 다음 요청에서 i18n/request.ts가 읽는다.
        document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
        startTransition(() => window.location.reload());
      }}
      className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
