import { mkdirSync } from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { Errors } from "@/lib/errors";

/**
 * 로컬 파일 저장 경로 빌더. 모든 경로는 `DATA_DIR` 하위로 정규화·검증한다.
 * 사용자 입력(세션 id, 파일명)을 경로에 직접 연결하지 말고 반드시 이 모듈을 경유 (보안 §10, path-traversal 방지).
 * ⚠️ 서버 전용(node:fs/path).
 */
const BASE = path.resolve(config.DATA_DIR);

export const StorageDirs = {
  uploads: "uploads",
  recordings: "recordings",
  tts: "tts",
  piperVoices: path.join("models", "piper"),
  whisperModels: path.join("models", "whisper"),
} as const;

/** base 하위로 안전하게 결합한다. 결과가 base를 벗어나면(`..`, 절대경로 등) throw. */
export function safeResolve(base: string, ...segments: string[]): string {
  const resolvedBase = path.resolve(base);
  const target = path.resolve(resolvedBase, ...segments);
  const rel = path.relative(resolvedBase, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw Errors.badRequest("허용되지 않은 파일 경로입니다", "UNSAFE_PATH");
  }
  return target;
}

/** 단일 경로 세그먼트(id/이름) 검증: 경로 구분자·상위참조·널바이트 금지. */
export function assertSafeSegment(segment: string): string {
  if (segment.length === 0 || segment === ".." || segment.includes("\0") || /[/\\]/.test(segment)) {
    throw Errors.badRequest("허용되지 않은 이름입니다", "UNSAFE_NAME");
  }
  return segment;
}

/** 파일명에서 디렉토리 성분을 제거(확장자 유지)하고 검증한다. */
export function safeFilename(filename: string): string {
  return assertSafeSegment(path.basename(filename));
}

/** DATA_DIR 절대경로. */
export function dataDir(): string {
  return BASE;
}

/** 디렉토리를 보장(없으면 생성)하고 그 경로를 반환. */
export function ensureDir(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 세션별 업로드 디렉토리. */
export function uploadDir(sessionId: string): string {
  return safeResolve(BASE, StorageDirs.uploads, assertSafeSegment(sessionId));
}

/** 세션 업로드 파일 경로 (사용자 제공 파일명 정화). */
export function uploadPath(sessionId: string, filename: string): string {
  return safeResolve(uploadDir(sessionId), safeFilename(filename));
}

/** 세션별 녹음 디렉토리. */
export function recordingDir(sessionId: string): string {
  return safeResolve(BASE, StorageDirs.recordings, assertSafeSegment(sessionId));
}

/** 녹음 파일 경로: `<recordings>/<sessionId>/<recordingId>.<ext>`. */
export function recordingPath(sessionId: string, recordingId: string, ext: string): string {
  const cleanExt = assertSafeSegment(ext.replace(/^\./, ""));
  const filename = `${assertSafeSegment(recordingId)}.${cleanExt}`;
  return safeResolve(recordingDir(sessionId), filename);
}

/** 세션별 TTS 캐시 디렉토리. */
export function ttsDir(sessionId: string): string {
  return safeResolve(BASE, StorageDirs.tts, assertSafeSegment(sessionId));
}

/** 데모 음성 캐시 경로: `<tts>/<sessionId>/v<version>-<slideIndex>[-<voice>].wav` (버전·슬라이드·음성별). */
export function demoAudioPath(
  sessionId: string,
  version: number,
  slideIndex: number,
  voice?: "female" | "male",
): string {
  const v = assertSafeSegment(String(version));
  const s = assertSafeSegment(String(slideIndex));
  // female은 기존 캐시 호환을 위해 접미사 없음. male만 `-male` 접미사.
  const suffix = voice === "male" ? "-male" : "";
  const filename = `v${v}-${s}${suffix}.wav`;
  return safeResolve(ttsDir(sessionId), filename);
}
