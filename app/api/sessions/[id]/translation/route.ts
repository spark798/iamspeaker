import { getDb } from "@/lib/db";
import { Errors, errorResponse } from "@/lib/errors";
import { loadScriptWithTranslation } from "@/lib/translation";

export const dynamic = "force-dynamic";

/**
 * SCR-02 자막 병기: 최신 스크립트를 사용자 모국어로 번역(원문+번역 병기용).
 * 모국어가 없거나 발표 언어와 같으면 번역 불필요(204). 결과는 캐시 후 재사용.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await loadScriptWithTranslation(getDb(), id);
    if (!result) throw Errors.notFound("스크립트가 아직 없습니다");
    if (!result.translation) {
      return new Response(null, { status: 204 }); // 번역 불필요
    }
    return Response.json(result.translation);
  } catch (err) {
    return errorResponse(err);
  }
}
