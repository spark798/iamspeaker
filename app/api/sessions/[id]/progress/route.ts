import { getDb } from "@/lib/db";
import { analysisResults, recordings } from "@/lib/db/schema";
import { errorResponse } from "@/lib/errors";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 세션의 회차별(녹음별) 분석 추이 — WPM/필러 수/길이를 시간순으로. */
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

    return Response.json({ attempts });
  } catch (err) {
    return errorResponse(err);
  }
}
