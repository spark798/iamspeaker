import { config } from "@/lib/config";

export interface ChatOptions {
  system?: string;
  prompt: string;
  timeoutMs?: number;
  temperature?: number;
  /** Ollama 구조화 출력 힌트(다른 provider는 무시). */
  format?: unknown;
}

/** provider-무관 LLM 호출 — JSON 콘텐츠를 unknown으로 반환(검증은 호출부 Zod). */
export type ChatJson = (opts: ChatOptions) => Promise<unknown>;

/**
 * 모델 응답 텍스트에서 JSON을 관대하게 추출한다(클라우드 모델은 코드펜스/산문을 덧붙일 수 있음).
 * 코드펜스 제거 → 그대로 파싱 → 실패 시 첫 {…}/[…] 구간 파싱.
 */
export function extractJson(text: string): unknown {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.search(/[[{]/);
    const end = Math.max(stripped.lastIndexOf("}"), stripped.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error("모델 응답을 JSON으로 파싱할 수 없습니다");
  }
}

/** Anthropic Messages API. ANTHROPIC_API_KEY 필요. */
export const claudeChatJson: ChatJson = async (opts) => {
  if (!config.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 미설정");
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.ANTHROPIC_MODEL,
        max_tokens: 4096,
        temperature: opts.temperature ?? 0.4,
        ...(opts.system ? { system: opts.system } : {}),
        messages: [{ role: "user", content: opts.prompt }],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
    });
  } catch (err) {
    throw new Error(`Anthropic 연결 실패: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw new Error(`Anthropic 오류 ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  return extractJson(text);
};

/** OpenAI Chat Completions API(JSON 모드). OPENAI_API_KEY 필요. */
export const openaiChatJson: ChatJson = async (opts) => {
  if (!config.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 미설정");
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.OPENAI_MODEL,
        temperature: opts.temperature ?? 0.4,
        response_format: { type: "json_object" },
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: opts.prompt },
        ],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
    });
  } catch (err) {
    throw new Error(`OpenAI 연결 실패: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw new Error(`OpenAI 오류 ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return extractJson(data.choices?.[0]?.message?.content ?? "");
};
