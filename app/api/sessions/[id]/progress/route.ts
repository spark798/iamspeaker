import { loadBaseline } from "@/lib/analysis/baselines";
import { type ProgressGoal, summarizeProgress } from "@/lib/analysis/progress";
import { getDb } from "@/lib/db";
import { analysisResults, recordings, sessions } from "@/lib/db/schema";
import { errorResponse } from "@/lib/errors";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 세션의 회차별(녹음별) 분석 추이 + 동기부여 요약(개선·베스트·목표·스트릭). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const recs = db
      .select()
      .from(recordings)
      .where(eq(recordings.sessionId, id))
      .orderBy(asc(recordings.createdAt))
      .all();

    const attempts = recs.map((r) => {
      const a = db
        .select()
        .from(analysisResults)
        .where(eq(analysisResults.recordingId, r.id))
        .get();
      return {
        recordingId: r.id,
        createdAt: r.createdAt,
        durationSec: r.durationSec,
        wpm: a?.wpm ?? null,
        fillerCount: a ? a.fillerWords.reduce((n, f) => n + f.count, 0) : null,
      };
    });

    // 목표(기준선): 세션 장르 + 비원어민 보정. 필러 상한은 ideal~hard 사이의 현실적 "양호" 지점.
    const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
    const baseline = loadBaseline(session?.genre ?? "talk");
    const nonNative = !!session?.nativeLanguage && session.nativeLanguage !== session.language;
    const wpmSpec = baseline.metrics.wpm;
    const fillerSpec = baseline.metrics.fillerPerMin;
    const goal: ProgressGoal = {
      wpmMin:
        nonNative && wpmSpec?.nonNativeIdealMin !== undefined
          ? wpmSpec.nonNativeIdealMin
          : (wpmSpec?.idealMin ?? 110),
      wpmMax:
        nonNative && wpmSpec?.nonNativeIdealMax !== undefined
          ? wpmSpec.nonNativeIdealMax
          : (wpmSpec?.idealMax ?? 150),
      fillerPerMinMax: fillerSpec
        ? Math.round(fillerSpec.ideal + (fillerSpec.hard - fillerSpec.ideal) * 0.4)
        : 5,
    };

    const summary = summarizeProgress(
      attempts.map((a) => ({
        recordingId: a.recordingId,
        createdAt: a.createdAt instanceof Date ? a.createdAt.getTime() : Number(a.createdAt),
        wpm: a.wpm,
        fillerPerMin:
          a.fillerCount !== null && a.durationSec > 0
            ? Math.round((a.fillerCount / (a.durationSec / 60)) * 10) / 10
            : null,
      })),
      goal,
    );

    return Response.json({ attempts, summary, goal });
  } catch (err) {
    return errorResponse(err);
  }
}
