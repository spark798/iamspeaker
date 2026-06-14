import { getRequestConfig } from "next-intl/server";

/** 지원 UI 로케일. 발표 언어(콘텐츠)와는 별개 개념. */
export const SUPPORTED_LOCALES = ["ko", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ko";

// URL 라우팅 없는 설정(셸 단순화). 기본 ko, 폴백 en. 추후 쿠키/설정으로 전환 가능.
export default getRequestConfig(async () => {
  const locale: Locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
