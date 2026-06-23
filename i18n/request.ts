import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

/** 지원 UI 로케일. 발표 언어(콘텐츠)와는 별개 개념. */
export const SUPPORTED_LOCALES = ["ko", "en", "ja", "zh", "es", "vi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ko";

/** UI 로케일 쿠키 이름 — LocaleSwitcher가 설정, 여기서 읽는다. */
export const LOCALE_COOKIE = "locale";

function isSupported(value: string | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

// URL 라우팅 없는 설정(셸 단순화). 쿠키로 로케일 선택, 없으면 기본 ko.
export default getRequestConfig(async () => {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isSupported(cookie) ? cookie : DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
