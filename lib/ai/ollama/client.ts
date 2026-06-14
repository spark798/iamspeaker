import { config } from "@/lib/config";

export interface OllamaChatOptions {
  system?: string;
  prompt: string;
  timeoutMs?: number;
  temperature?: number;
}

/**
 * Ollama `/api/chat` 호출(format:json 강제) 후 JSON 콘텐츠를 파싱해 unknown으로 반환.
 * 출력 검증은 호출부에서 Zod로 수행(미신뢰 경계). 제품 런타임은 MCP가 아니라 이 HTTP 경로를 쓴다.
 */
export async function ollamaChatJson(opts: OllamaChatOptions): Promise<unknown> {
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];

  let res: Response;
  try {
    res = await fetch(`${config.OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.OLLAMA_MODEL,
        stream: false,
        format: "json",
        messages,
        options: { temperature: opts.temperature ?? 0.4 },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
    });
  } catch (err) {
    throw new Error(
      `Ollama 연결 실패 (${config.OLLAMA_HOST}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    throw new Error(`Ollama 오류 ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const content = data.message?.content ?? "";
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Ollama 응답을 JSON으로 파싱할 수 없습니다");
  }
}
