/**
 * preflight — 외부 의존 바이너리/서비스 가용성 점검.
 * 실행: `pnpm preflight`
 *
 * 현재 선택된 엔진(로컬/클라우드)에 따라 필요한 것만 "필수"로 판정한다.
 * - ffmpeg: 항상 필수(오디오 정규화)
 * - libreoffice: PPTX 처리에 필요(권장)
 * - ollama/piper/whisper: 해당 로컬 엔진이 선택된 경우에만 필수
 */
import { spawnSync } from "node:child_process";

// .env가 있으면 먼저 로드(스크립트는 Next처럼 자동 로드되지 않음). 이후 config를 동적 import.
try {
  process.loadEnvFile(".env");
} catch {
  // .env가 없으면 기본값으로 진행
}

const { config, engines } = await import("../lib/config");

type Status = "ok" | "warn" | "fail";
interface CheckResult {
  name: string;
  required: boolean;
  status: Status;
  detail: string;
}

function checkBinary(name: string, bin: string, args: string[], required: boolean): CheckResult {
  const r = spawnSync(bin, args, { encoding: "utf8" });
  if (r.error) {
    const code = (r.error as NodeJS.ErrnoException).code;
    const detail = code === "ENOENT" ? `미설치 또는 PATH에 없음 (${bin})` : r.error.message;
    return { name, required, status: required ? "fail" : "warn", detail };
  }
  const firstLine = (r.stdout || r.stderr || "").split("\n")[0]?.trim() ?? "";
  return { name, required, status: "ok", detail: firstLine || `${bin} 확인됨` };
}

function checkLibreOffice(required: boolean): CheckResult {
  for (const bin of ["soffice", "libreoffice"]) {
    const res = checkBinary("LibreOffice", bin, ["--version"], required);
    if (res.status === "ok") return res;
  }
  return {
    name: "LibreOffice",
    required,
    status: required ? "fail" : "warn",
    detail: "soffice/libreoffice 미설치 (PPTX→PDF 변환에 필요)",
  };
}

async function checkOllama(host: string, required: boolean): Promise<CheckResult> {
  try {
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) {
      return {
        name: "Ollama",
        required,
        status: required ? "fail" : "warn",
        detail: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    const names = (data.models ?? []).map((m) => m.name).join(", ");
    return {
      name: "Ollama",
      required,
      status: "ok",
      detail: names ? `연결됨 — 모델: ${names}` : "연결됨 (설치된 모델 없음)",
    };
  } catch {
    return {
      name: "Ollama",
      required,
      status: required ? "fail" : "warn",
      detail: `연결 불가 (${host}). 'ollama serve' 실행 여부 확인`,
    };
  }
}

const checks: CheckResult[] = [];

// ffmpeg — 항상 필수
checks.push(checkBinary("ffmpeg", config.FFMPEG_BIN, ["-version"], true));
// LibreOffice — PPTX 처리(권장)
checks.push(checkLibreOffice(false));

// 엔진별 로컬 의존성
if (engines.script === "ollama") {
  checks.push(await checkOllama(config.OLLAMA_HOST, true));
} else {
  checks.push({
    name: "Ollama",
    required: false,
    status: "ok",
    detail: `클라우드 스크립트 엔진(${engines.script}) 사용 — 로컬 불필요`,
  });
}
if (engines.tts === "piper") {
  checks.push(checkBinary("Piper(TTS)", config.PIPER_BIN, ["--version"], true));
} else {
  checks.push({
    name: "Piper(TTS)",
    required: false,
    status: "ok",
    detail: `클라우드 TTS(${engines.tts}) 사용 — 로컬 불필요`,
  });
}
if (engines.stt === "whispercpp") {
  checks.push(checkBinary("Whisper.cpp(STT)", config.WHISPER_BIN, ["--help"], true));
} else {
  checks.push({
    name: "Whisper.cpp(STT)",
    required: false,
    status: "ok",
    detail: `클라우드 STT(${engines.stt}) 사용 — 로컬 불필요`,
  });
}

const icon: Record<Status, string> = { ok: "✅", warn: "⚠️ ", fail: "❌" };
console.log("\n  iamspeaker preflight — 외부 의존성 점검\n");
console.log(`  활성 엔진: script=${engines.script}, tts=${engines.tts}, stt=${engines.stt}\n`);
for (const c of checks) {
  const tag = c.required ? "[필수]" : "[권장]";
  console.log(`  ${icon[c.status]} ${tag} ${c.name.padEnd(18)} ${c.detail}`);
}

const failed = checks.filter((c) => c.status === "fail");
if (failed.length > 0) {
  console.log(
    `\n  ❌ 필수 의존성 ${failed.length}개 미충족. 설치 후 다시 실행하세요. (README 참고)\n`,
  );
  process.exit(1);
}
console.log("\n  ✅ 필수 의존성 충족.\n");
