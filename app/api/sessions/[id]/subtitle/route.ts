import { getDb } from "@/lib/db";
import { Errors, errorResponse } from "@/lib/errors";
import { type SrtCue, buildSrt } from "@/lib/subtitle/srt";
import { loadScriptWithTranslation } from "@/lib/translation";

export const dynamic = "force-dynamic";

/**
 * SCR-07 자막 export: 최신 AI 데모 스크립트를 SRT로 내려준다(원문 + 모국어 번역 병기).
 * 타이밍은 발화 추정 시간 기반(데모엔 실제 타임스탬프 없음). 다운로드 첨부.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await loadScriptWithTranslation(getDb(), id);
    if (!result) throw Errors.notFound("스크립트가 아직 없습니다");

    const trByIndex = new Map(result.translation?.content.map((c) => [c.slideIndex, c.text]) ?? []);
    const cues: SrtCue[] = result.script.map((c) => ({
      text: c.text,
      translation: trByIndex.get(c.slideIndex),
    }));
    const srt = buildSrt(cues);

    return new Response(srt, {
      headers: {
        "Content-Type": "application/x-subrip; charset=utf-8",
        "Content-Disposition": 'attachment; filename="iamspeaker-demo.srt"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
