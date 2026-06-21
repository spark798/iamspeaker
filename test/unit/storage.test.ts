import {
  assertSafeSegment,
  dataDir,
  demoAudioPath,
  recordingPath,
  safeFilename,
  safeResolve,
  uploadPath,
} from "@/lib/storage";
import { describe, expect, it } from "vitest";

describe("storage 경로 빌더", () => {
  it("업로드 경로가 DATA_DIR 하위에 생성된다", () => {
    const p = uploadPath("sess-1", "deck.pdf");
    expect(p.startsWith(dataDir())).toBe(true);
    expect(p.endsWith("/uploads/sess-1/deck.pdf")).toBe(true);
  });

  it("녹음 경로가 <sessionId>/<id>.<ext> 형태로 생성된다", () => {
    const p = recordingPath("sess-1", "rec-9", ".webm");
    expect(p.endsWith("/recordings/sess-1/rec-9.webm")).toBe(true);
  });

  it("파일명에서 디렉토리 성분을 제거한다", () => {
    expect(safeFilename("a/b/c.pdf")).toBe("c.pdf");
  });

  it("데모 음성 캐시 경로가 v<버전>-<슬라이드>.wav 형태로 생성된다", () => {
    const p = demoAudioPath("sess-1", 2, 0);
    expect(p.endsWith("/tts/sess-1/v2-0.wav")).toBe(true);
    expect(p.startsWith(dataDir())).toBe(true);
  });

  it("경로 탈출(..)·절대경로를 차단한다", () => {
    expect(() => safeResolve(dataDir(), "../../etc/passwd")).toThrow(/허용되지 않은 파일 경로/);
    expect(() => safeResolve(dataDir(), "/etc/passwd")).toThrow();
    // 디렉토리 세그먼트(sessionId)에 구분자가 있으면 throw
    expect(() => uploadPath("../../etc", "x")).toThrow();
  });

  it("파일명의 경로 탈출은 basename으로 정화한다(throw 아님)", () => {
    const p = uploadPath("sess-1", "../../../secret");
    expect(p.endsWith("/uploads/sess-1/secret")).toBe(true);
    expect(p.startsWith(dataDir())).toBe(true);
  });

  it("위험한 세그먼트를 거부한다", () => {
    expect(() => assertSafeSegment("..")).toThrow(/허용되지 않은 이름/);
    expect(() => assertSafeSegment("a/b")).toThrow();
    expect(() => assertSafeSegment("a\\b")).toThrow();
    expect(() => assertSafeSegment("")).toThrow();
    expect(assertSafeSegment("rec-9")).toBe("rec-9");
  });
});
