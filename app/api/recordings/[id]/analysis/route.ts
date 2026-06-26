import { loadBaseline } from "@/lib/analysis/baselines";
import { generateCues } from "@/lib/analysis/cues";
import { resolveGoal } from "@/lib/analysis/goal";
import { scoreAnalysis } from "@/lib/analysis/percentile";
import { getDb } from "@/lib/db";
import { analysisResults, recordings, sessions, slides } from "@/lib/db/schema";
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

    // 슬라이드 밀도(덱 단위, 세션의 슬라이드 본문 평균 단어 수).
    const deck = session
      ? db.select().from(slides).where(eq(slides.sessionId, session.id)).all()
      : [];
    const avgWordsPerSlide =
      deck.length > 0
        ? deck.reduce(
            (sum, s) => sum + s.textContent.trim().split(/\s+/).filter(Boolean).length,
            0,
          ) / deck.length
        : undefined;

    const scores = scoreAnalysis(
      {
        wpm: row.wpm,
        totalFillers,
        pauseCount: row.pauseCount,
        durationSec: rec?.durationSec ?? 0,
        avgWordsPerSlide,
        nonNative,
      },
      baseline,
    );

    // 처방적 코칭 신호: 슬라이드별 페이스·시간예산·필러 밀집(어디서 무엇을).
    const goal = resolveGoal(session ?? {}, baseline, nonNative);
    const cues = generateCues({
      breakdown: row.slideTimeBreakdown,
      transitions: rec?.transitions ?? [],
      totalDurationSec: rec?.durationSec ?? 0,
      fillerWords: row.fillerWords,
      goalWpmMin: goal.wpmMin,
      goalWpmMax: goal.wpmMax,
      targetDurationSec: session?.targetDurationSec ?? 0,
      slideCount: deck.length,
    });

    return Response.json({
      sessionId: rec?.sessionId ?? null,
      durationSec: rec?.durationSec ?? 0,
      wpm: row.wpm,
      fillerWords: row.fillerWords,
      slideTimeBreakdown: row.slideTimeBreakdown,
      pronunciationIssues: row.pronunciationIssues,
      pronunciationScore: row.pronunciationScore,
      pauseCount: row.pauseCount,
      scores,
      cues,
      baselineGenre: baseline.genre,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
