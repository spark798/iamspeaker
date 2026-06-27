import { config } from "@/lib/config";
import { renderPageAsImage } from "unpdf";

/**
 * PDF 한 페이지 → PNG 바이트(서버 사이드, @napi-rs/canvas 백엔드).
 * page는 1-based(슬라이드 인덱스 0 → page 1). 순수 JS pdfjs(unpdf) + 프리빌트 canvas.
 * ⚠️ 서버 전용.
 */
export async function renderPdfPageToPng(pdfBytes: Uint8Array, page: number): Promise<Uint8Array> {
  const png = await renderPageAsImage(pdfBytes, page, {
    scale: config.SLIDE_RENDER_SCALE,
    canvasImport: () => import("@napi-rs/canvas"),
  });
  return new Uint8Array(png);
}
