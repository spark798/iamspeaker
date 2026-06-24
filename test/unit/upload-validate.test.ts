import { assertSizeWithinLimit, validateUploadFile } from "@/lib/upload/validate";
import { describe, expect, it } from "vitest";

const LIMITS = { allowedExt: ["pptx", "pdf"], maxBytes: 1024 };
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const PPTX_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // PK..

describe("validateUploadFile", () => {
  it("정상 PDF/PPTX를 통과시키고 확장자 반환", () => {
    expect(validateUploadFile("deck.pdf", PDF_BYTES, LIMITS)).toBe("pdf");
    expect(validateUploadFile("deck.PPTX", PPTX_BYTES, LIMITS)).toBe("pptx");
  });

  it("허용되지 않은 확장자는 415", () => {
    expect(() => validateUploadFile("a.key", PDF_BYTES, LIMITS)).toThrow(/허용되지 않는 형식/);
  });

  it("빈 파일/크기 초과를 거부", () => {
    expect(() => validateUploadFile("a.pdf", new Uint8Array(), LIMITS)).toThrow(/빈 파일/);
    expect(() => validateUploadFile("a.pdf", new Uint8Array(2048).fill(0x25), LIMITS)).toThrow(
      /너무 큽니다/,
    );
  });

  it("매직바이트 불일치를 거부(확장자 위장 차단)", () => {
    const fakePdf = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(() => validateUploadFile("a.pdf", fakePdf, LIMITS)).toThrow(/일치하지 않습니다/);
  });
});

describe("assertSizeWithinLimit", () => {
  it("한도 이하는 통과, 초과는 413(본문 적재 전 방어)", () => {
    expect(() => assertSizeWithinLimit(1024, 2048)).not.toThrow();
    expect(() => assertSizeWithinLimit(2048, 2048)).not.toThrow();
    expect(() => assertSizeWithinLimit(2049, 2048)).toThrow(/너무 큽니다/);
  });
});

describe("validateUploadFile — 오디오 매직바이트", () => {
  const AUDIO = {
    allowedExt: ["webm", "wav", "m4a", "mp3", "ogg", "oga", "opus", "mp4", "aac"],
    maxBytes: 1024,
  };
  const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
  // 컨테이너 헤더 + 패딩(매직만 검사하므로 내용은 0으로 채움).
  const withTail = (head: number[], len = 16) => {
    const b = new Uint8Array(len);
    b.set(head);
    return b;
  };

  it.each([
    ["rec.webm", withTail([0x1a, 0x45, 0xdf, 0xa3]), "webm"],
    [
      "rec.wav",
      (() => {
        const b = new Uint8Array(16);
        b.set(ascii("RIFF"), 0);
        b.set(ascii("WAVE"), 8);
        return b;
      })(),
      "wav",
    ],
    ["rec.ogg", withTail([...ascii("OggS")]), "ogg"],
    ["rec.opus", withTail([...ascii("OggS")]), "opus"],
    [
      "rec.mp4",
      (() => {
        const b = new Uint8Array(16);
        b.set(ascii("ftyp"), 4);
        return b;
      })(),
      "mp4",
    ],
    [
      "rec.m4a",
      (() => {
        const b = new Uint8Array(16);
        b.set(ascii("ftyp"), 4);
        return b;
      })(),
      "m4a",
    ],
    ["rec.mp3", withTail([...ascii("ID3")]), "mp3"],
    ["rec.mp3", withTail([0xff, 0xfb]), "mp3"], // MPEG 프레임 동기
    ["rec.aac", withTail([0xff, 0xf1]), "aac"], // ADTS 동기
  ])("정상 %s를 통과", (name, bytes, expected) => {
    expect(validateUploadFile(name, bytes, AUDIO)).toBe(expected);
  });

  it("오디오 확장자 위장(webm인데 내용이 무작위)을 거부", () => {
    const fake = withTail([0x00, 0x01, 0x02, 0x03]);
    expect(() => validateUploadFile("rec.webm", fake, AUDIO)).toThrow(/일치하지 않습니다/);
    expect(() => validateUploadFile("rec.wav", fake, AUDIO)).toThrow(/일치하지 않습니다/);
  });
});
