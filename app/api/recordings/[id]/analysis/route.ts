import { getDb } from "@/lib/db";
import { analysisResults } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 녹음의 분석 결과(WPM/필러/시간배분)를 반환. 아직 없으면 404. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const row = getDb()
      .select()
      .from(analysisResults)
      .where(eq(analysisResults.recordingId, id))
      .get();
    if (!row) throw Errors.notFound("분석 결과가 아직 없습니다");
    return Response.json({
      wpm: row.wpm,
      fillerWords: row.fillerWords,
      slideTimeBreakdown: row.slideTimeBreakdown,
      pronunciationIssues: row.pronunciationIssues,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
