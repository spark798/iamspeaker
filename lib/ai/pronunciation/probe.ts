import { spawnSync } from "node:child_process";
import { config } from "@/lib/config";

/**
 * 발음 스코어러 모드 결정(순수 함수). auto면 wav2vec2 가용 여부로 자동 선택.
 * wav2vec2=강제, heuristic=강제, auto=가용하면 wav2vec2 아니면 heuristic.
 */
export function resolvePronunciationScorer(
  mode: "auto" | "heuristic" | "wav2vec2",
  available: boolean,
): "wav2vec2" | "heuristic" {
  if (mode === "wav2vec2") return "wav2vec2";
  if (mode === "auto" && available) return "wav2vec2";
  return "heuristic";
}

let cached: boolean | undefined;

/**
 * wav2vec2 GOP 스택(Python+torch+transformers+phonemizer) 가용 여부 프로브 — `gop.py --selftest`.
 * 프로세스당 1회만 실행하고 캐시(런타임 감지). Python/의존성 없으면 false → 휴리스틱 폴백.
 */
export function gopAvailable(): boolean {
  if (cached !== undefined) return cached;
  try {
    const r = spawnSync(config.PYTHON_BIN, ["scripts/pronunciation/gop.py", "--selftest"], {
      encoding: "utf8",
      timeout: 30_000,
    });
    cached = r.status === 0 && r.stdout.trim() === "ok";
  } catch {
    cached = false;
  }
  return cached;
}

/** 테스트용 캐시 리셋. */
export function _resetGopProbeCache(): void {
  cached = undefined;
}
