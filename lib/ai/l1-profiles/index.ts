import type { L1Profile } from "@/lib/domain";
import { z } from "zod";
import jaProfile from "./ja.json";
import koProfile from "./ko.json";
import zhProfile from "./zh.json";

/**
 * 모국어(L1) 프로필 로더. 언어팩은 JSON 추가로 확장(현재 ko).
 * 자체 데이터지만 형태 안정성을 위해 Zod로 검증한다.
 */
const L1Schema = z.object({
  language: z.string().min(1),
  commonPronunciationIssues: z.array(
    z.object({
      targetPhoneme: z.string(),
      commonSubstitution: z.string(),
      description: z.string(),
    }),
  ),
  commonExpressionIssues: z.array(
    z.object({ pattern: z.string(), issue: z.string(), suggestion: z.string() }),
  ),
});

const PROFILES: Record<string, unknown> = { ko: koProfile, ja: jaProfile, zh: zhProfile };

/** 모국어 코드(예: 'ko')에 해당하는 L1 프로필. 없으면 undefined. */
export function loadL1Profile(language: string | null | undefined): L1Profile | undefined {
  if (!language) return undefined;
  const raw = PROFILES[language];
  if (!raw) return undefined;
  return L1Schema.parse(raw);
}
