import { loadBaseline } from "@/lib/analysis/baselines";
import { scoreAnalysis } from "@/lib/analysis/percentile";
import { getDb } from "@/lib/db";
import { analysisResults, recordings, sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 녹음의 분석 결과(WPM/필러/시간배분/발음) + 기준선 대비 점수(B-001)를 반환. 없으면 404. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db.select().from(analysisResults).where(eq(analysisResults.recordingId, id)).get();
    if (!row) throw Errors.notFound("분석 결과가 아직 없습니다");

    // 점수 환산에 필요한 컨텍스트(녹음 길이·발표/모국어). 없어도 분석 자체는 반환.
    const rec = db.select().from(recordings).where(eq(recordings.id, id)).get();
    const session = rec
      ? db.select().from(sessions).where(eq(sessions.id, rec.sessionId)).get()
      : undefined;

    // 세션 장르로 기준선 선택(미설정 시 talk). 비원어민 = 모국어가 발표 언어와 다름.
    const baseline = loadBaseline(session?.genre ?? "talk");
    const nonNative = !!session?.nativeLanguage && session.nativeLanguage !== session.language;
    const totalFillers = row.fillerWords.reduce((sum, f) => sum + f.count, 0);
    const scores = scoreAnalysis(
      { wpm: row.wpm, totalFillers, durationSec: rec?.durationSec ?? 0, nonNative },
      baseline,
    );

    return Response.json({
      wpm: row.wpm,
      fillerWords: row.fillerWords,
      slideTimeBreakdown: row.slideTimeBreakdown,
      pronunciationIssues: row.pronunciationIssues,
      scores,
      baselineGenre: baseline.genre,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
