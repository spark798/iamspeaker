import type { SlideContent } from "@/lib/domain";
import { extractText, getDocumentProxy } from "unpdf";

/** PDF에서 페이지별 텍스트를 추출(순수 JS pdfjs, 네이티브 의존 없음). 노트는 PDF에 없음 → null. */
export async function parsePdf(bytes: Uint8Array): Promise<SlideContent[]> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((t, index) => ({
    index,
    textContent: t.replace(/\s+/g, " ").trim(),
    notes: null,
  }));
}
