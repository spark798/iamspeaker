// @vitest-environment node
import { LibreOfficeUnavailableError, convertPptxToPdf } from "@/lib/slides/convert";
import { renderPdfPageToPng } from "@/lib/slides/render";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

/** 내용 있는 1페이지 PDF(폰트 불필요 — 사각형). */
async function makePdf(pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([300, 200]);
    page.drawRectangle({ x: 20, y: 20, width: 120, height: 90 });
  }
  return new Uint8Array(await doc.save());
}

describe("renderPdfPageToPng (unpdf + @napi-rs/canvas)", () => {
  it("PDF 1페이지 → 유효한 PNG 바이트", async () => {
    const png = await renderPdfPageToPng(await makePdf(), 1);
    // PNG 시그니처(89 50 4E 47)
    expect([png[0], png[1], png[2], png[3]]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(png.byteLength).toBeGreaterThan(100);
  }, 30_000);

  it("손상된 바이트 → reject", async () => {
    await expect(renderPdfPageToPng(new Uint8Array([1, 2, 3, 4]), 1)).rejects.toThrow();
  }, 30_000);
});

describe("convertPptxToPdf 폴백", () => {
  it("LibreOffice 변환 불가(미설치/실패) → LibreOfficeUnavailableError", async () => {
    // soffice 미설치 시 spawn ENOENT, 설치돼도 존재하지 않는 파일이라 비정상 종료 — 둘 다 동일 에러로 폴백.
    await expect(convertPptxToPdf("/nonexistent-iamspeaker-test.pptx")).rejects.toBeInstanceOf(
      LibreOfficeUnavailableError,
    );
  }, 30_000);
});
