import type { SlideContent } from "@/lib/domain";
import { Errors } from "@/lib/errors";
import { parsePdf } from "./pdf";
import { parsePptx } from "./pptx";

export { parsePdf } from "./pdf";
export { parsePptx } from "./pptx";

/** 파일명 확장자로 파서를 선택해 슬라이드 본문/노트를 추출. */
export async function parseSlides(filename: string, bytes: Uint8Array): Promise<SlideContent[]> {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "pdf":
      return parsePdf(bytes);
    case "pptx":
      return parsePptx(bytes);
    default:
      throw Errors.badRequest(`지원하지 않는 형식입니다: ${ext ?? "(없음)"}`, "UNSUPPORTED_FORMAT");
  }
}
