import { parsePdf, parsePptx, parseSlides } from "@/lib/slides";
import { strToU8, zipSync } from "fflate";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

/** 최소 PPTX(zip) 구성: 슬라이드 2장 + 슬라이드1 노트. */
function makePptx(): Uint8Array {
  const slide = (runs: string[]) =>
    `<?xml version="1.0"?><p:sld><p:cSld><p:spTree>${runs
      .map((r) => `<a:p><a:r><a:t>${r}</a:t></a:r></a:p>`)
      .join("")}</p:spTree></p:cSld></p:sld>`;
  const files: Record<string, Uint8Array> = {
    "ppt/slides/slide1.xml": strToU8(slide(["Hello", "World"])),
    "ppt/slides/slide2.xml": strToU8(slide(["Second slide"])),
    "ppt/slides/_rels/slide1.xml.rels": strToU8(
      `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="../notesSlides/notesSlide1.xml"/></Relationships>`,
    ),
    "ppt/notesSlides/notesSlide1.xml": strToU8(
      `<?xml version="1.0"?><p:notes><a:p><a:r><a:t>Note for slide 1</a:t></a:r></a:p></p:notes>`,
    ),
  };
  return zipSync(files);
}

async function makePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const line of ["Page one text", "Page two text"]) {
    const page = doc.addPage([300, 200]);
    page.drawText(line, { x: 20, y: 150, size: 16, font });
  }
  return doc.save();
}

describe("parsePptx", () => {
  it("슬라이드별 텍스트와 노트를 추출", () => {
    const out = parsePptx(makePptx());
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ index: 0, textContent: "Hello World", notes: "Note for slide 1" });
    expect(out[1]).toEqual({ index: 1, textContent: "Second slide", notes: null });
  });
});

describe("parsePdf", () => {
  it("페이지별 텍스트를 추출(노트 없음)", async () => {
    const out = await parsePdf(await makePdf());
    expect(out).toHaveLength(2);
    expect(out[0]?.textContent).toContain("Page one");
    expect(out[1]?.textContent).toContain("Page two");
    expect(out[0]?.notes).toBeNull();
  });
});

describe("parseSlides 디스패치", () => {
  it("확장자로 파서 선택", async () => {
    const out = await parseSlides("deck.pptx", makePptx());
    expect(out).toHaveLength(2);
  });

  it("지원하지 않는 형식은 throw", async () => {
    await expect(parseSlides("deck.key", new Uint8Array())).rejects.toThrow(/지원하지 않는 형식/);
  });
});
