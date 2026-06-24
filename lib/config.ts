import { z } from "zod";

/**
 * 환경변수 스키마 — `.env.example`과 1:1 대응.
 * 모든 항목에 기본값/optional을 두어, `.env` 없이도(로컬 우선 원칙) 파싱이 성공한다.
 * 값이 "잘못된" 경우(예: 숫자 자리에 문자)에만 fail-fast 한다.
 */
const EnvSchema = z.object({
  // 앱 기본
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATA_DIR: z.string().min(1).default("./data"),
  DATABASE_URL: z.string().min(1).default("file:./data/iamspeaker.db"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  // 업로드 제한
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(50),
  ALLOWED_UPLOAD_EXT: z
    .string()
    .default("pptx,pdf")
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    ),

  // 로컬 AI 모델
  OLLAMA_HOST: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().min(1).default("llama3.1:8b"),
  PIPER_BIN: z.string().min(1).default("piper"),
  PIPER_VOICE_DIR: z.string().min(1).default("./data/models/piper"),
  PIPER_DEFAULT_VOICE: z.string().min(1).default("en_US-amy-medium"),
  WHISPER_BIN: z.string().min(1).default("whisper-cli"),
  WHISPER_MODEL_PATH: z.string().min(1).default("./data/models/whisper/ggml-base.en.bin"),
  FFMPEG_BIN: z.string().min(1).default("ffmpeg"),

  // 발음 평가: heuristic(기본, 의존성 0) | wav2vec2(옵션, Python+torch GOP)
  PRONUNCIATION_SCORER: z.enum(["heuristic", "wav2vec2"]).default("heuristic"),
  PYTHON_BIN: z.string().min(1).default("python3"),
  WAV2VEC2_PHONEME_MODEL: z.string().min(1).default("facebook/wav2vec2-lv-60-espeak-cv-ft"),
  // GOP confidence가 이 값 미만이면 발음 이슈로 플래그(운영 환경별 보정). 0~1.
  WAV2VEC2_GOP_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),

  // 선택적 클라우드 어댑터 (미설정 시 로컬 폴백)
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-4-6"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  AZURE_SPEECH_KEY: z.string().min(1).optional(),
  AZURE_SPEECH_REGION: z.string().min(1).optional(),

  // 작업 워커
  JOB_CONCURRENCY: z.coerce.number().int().positive().default(1),
  JOB_TIMEOUT_SEC: z.coerce.number().int().positive().default(600),
  // 신뢰성: 실패 시 최대 시도 횟수(1=무재시도) · 백오프 기준(ms, 지연=base×2^(n-1)) · 완료 잡 TTL(시간)
  JOB_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  JOB_RETRY_BASE_MS: z.coerce.number().int().positive().default(1000),
  JOB_TTL_HOURS: z.coerce.number().int().positive().default(24),

  // 레이트리밋(인프로세스, 라우트·IP별 고정창). 폭주/남용 방어. 셀프호스트 단일 프로세스 전제.
  RATE_LIMIT_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v !== "0" && v !== "false"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(60),

  // 테스트/E2E 전용: 모든 AI 어댑터를 stub으로 강제(모델 없이 결정적 동작). "1"|"true"면 활성.
  USE_STUB_ADAPTERS: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export type Config = z.infer<typeof EnvSchema>;

/** 현재 활성 엔진(로컬 vs 클라우드) — 클라우드 키가 있으면 우선. UI 표시·팩토리에서 사용. */
export interface Engines {
  script: "claude" | "openai" | "ollama";
  tts: "elevenlabs" | "piper";
  stt: "azure" | "openai-whisper" | "whispercpp";
}

type EnvSource = Record<string, string | undefined>;

/** `.env`의 빈 문자열("KEY=")은 미설정(undefined)으로 취급 → optional/기본값이 정상 동작. */
function normalize(source: EnvSource): EnvSource {
  const out: EnvSource = {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = value === "" ? undefined : value;
  }
  return out;
}

/** 환경변수를 파싱한다. 잘못된 값이면 사람이 읽을 수 있는 메시지로 throw (fail-fast). */
export function parseEnv(source: EnvSource = process.env): Config {
  const result = EnvSchema.safeParse(normalize(source));
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new Error(`잘못된 환경변수 설정입니다. .env를 확인하세요:\n${lines.join("\n")}`);
  }
  return result.data;
}

export function deriveEngines(c: Config): Engines {
  return {
    script: c.ANTHROPIC_API_KEY ? "claude" : c.OPENAI_API_KEY ? "openai" : "ollama",
    tts: c.ELEVENLABS_API_KEY ? "elevenlabs" : "piper",
    stt: c.AZURE_SPEECH_KEY ? "azure" : c.OPENAI_API_KEY ? "openai-whisper" : "whispercpp",
  };
}

/** 앱 전역에서 사용하는 검증된 설정 싱글턴. import 시점에 한 번 파싱(fail-fast). */
export const config: Config = parseEnv();

/** 현재 선택된 엔진들. */
export const engines: Engines = deriveEngines(config);
