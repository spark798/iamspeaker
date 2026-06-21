import { SUPPORTED_LOCALES } from "@/i18n/request";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import zh from "@/messages/zh.json";
import { describe, expect, it } from "vitest";

type Json = Record<string, unknown>;

/** 중첩 객체를 평탄한 키 경로 집합으로. */
function keyPaths(obj: Json, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" && !Array.isArray(v) ? keyPaths(v as Json, path) : [path];
  });
}

const messages: Record<string, Json> = { ko, en, ja, zh };
const enKeys = keyPaths(en as Json).sort();

describe("i18n 메시지 파일", () => {
  it("SUPPORTED_LOCALES와 메시지 파일이 일치", () => {
    expect([...SUPPORTED_LOCALES].sort()).toEqual(Object.keys(messages).sort());
  });

  it.each(["ko", "ja", "zh"])("%s 키 집합이 en과 동일(누락/오타 없음)", (locale) => {
    const keys = keyPaths(messages[locale] as Json).sort();
    expect(keys).toEqual(enKeys);
  });

  it.each(["ko", "ja", "zh"])("%s 값이 모두 비어있지 않음", (locale) => {
    for (const path of keyPaths(messages[locale] as Json)) {
      const value = path.split(".").reduce<unknown>((o, k) => (o as Json)?.[k], messages[locale]);
      expect(typeof value === "string" && value.length > 0).toBe(true);
    }
  });
});
