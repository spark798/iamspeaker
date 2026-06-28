import { getDb } from "@/lib/db";
import { Errors, errorResponse } from "@/lib/errors";
import { isTranslatableLang, loadScriptWithTranslation } from "@/lib/translation";

export const dynamic = "force-dynamic";

/**
 * SCR-02/07 자막 병기·다국어 출력: 최신 스크립트를 대상 언어로 번역(원문+번역 병기용).
 * `?lang=<지원 로케일>`이면 그 언어, 없으면 모국어. 대상=발표언어/미지원이면 번역 불필요(204). 캐시 재사용.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const langParam = new URL(req.url).searchParams.get("lang");
    if (langParam !== null && !isTranslatableLang(langParam)) {
      throw Errors.badRequest("지원하지 않는 번역 대상 언어입니다");
    }
    const result = await loadScriptWithTranslation(getDb(), id, langParam ?? undefined);
    if (!result) throw Errors.notFound("스크립트가 아직 없습니다");
    if (!result.translation) {
      return new Response(null, { status: 204 }); // 번역 불필요
    }
    return Response.json(result.translation);
  } catch (err) {
    return errorResponse(err);
  }
}
