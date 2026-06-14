import { validateUploadFile } from "@/lib/upload/validate";
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
