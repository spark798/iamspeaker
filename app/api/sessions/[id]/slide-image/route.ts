import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname } from "node:path";
import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { LibreOfficeUnavailableError, convertPptxToPdf } from "@/lib/slides/convert";
import { renderPdfPageToPng } from "@/lib/slides/render";
import { slideImagePath, slidePdfCachePath } from "@/lib/storage";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * SCR-02: 슬라이드 한 장을 PNG 썸네일로 렌더해 스트리밍(데모 발표 리뷰용).
 * `?slide=<index>`(0-based) 필수. PDF는 직접, PPTX는 LibreOffice로 PDF 변환 후 렌더.
 * 결과는 디스크 캐시(슬라이드별). LibreOffice 미설치 시 404 → UI는 텍스트 카드로 폴백.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const slideParam = url.searchParams.get("slide");
    if (slideParam === null) throw Errors.badRequest("slide 파라미터가 필요합니다");
    const slideIndex = Number(slideParam);
    if (!Number.isInteger(slideIndex) || slideIndex < 0) {
      throw Errors.badRequest("slide는 0 이상의 정수여야 합니다");
    }

    const db = getDb();
    const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
    if (!session) throw Errors.notFound("세션을 찾을 수 없습니다");
    if (!session.slideFilePath || !existsSync(session.slideFilePath)) {
      throw Errors.notFound("원본 슬라이드 파일이 없습니다");
    }

    const cachePath = slideImagePath(id, slideIndex);
    let png: Uint8Array;
    if (existsSync(cachePath)) {
      png = new Uint8Array(readFileSync(cachePath));
    } else {
      // 렌더 소스 PDF 확보(PPTX면 1회 변환·캐시).
      let pdfBytes: Uint8Array;
      const ext = extname(session.slideFilePath).toLowerCase();
      if (ext === ".pdf") {
        pdfBytes = new Uint8Array(readFileSync(session.slideFilePath));
      } else {
        const cache = slidePdfCachePath(id);
        if (existsSync(cache)) {
          pdfBytes = new Uint8Array(readFileSync(cache));
        } else {
          try {
            pdfBytes = await convertPptxToPdf(session.slideFilePath);
          } catch (e) {
            if (e instanceof LibreOfficeUnavailableError) {
              throw Errors.notFound("슬라이드 이미지를 만들 수 없습니다(LibreOffice 필요)");
            }
            throw e;
          }
          mkdirSync(dirname(cache), { recursive: true });
          writeFileSync(cache, pdfBytes);
        }
      }
      try {
        png = await renderPdfPageToPng(pdfBytes, slideIndex + 1);
      } catch {
        throw Errors.notFound("해당 슬라이드를 렌더할 수 없습니다");
      }
      mkdirSync(dirname(cachePath), { recursive: true });
      writeFileSync(cachePath, png);
    }

    const body = new ArrayBuffer(png.byteLength);
    new Uint8Array(body).set(png);
    return new Response(body, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.byteLength),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
