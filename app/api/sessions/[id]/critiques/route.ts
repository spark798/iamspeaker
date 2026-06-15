import { getDb } from "@/lib/db";
import { slideCritiques } from "@/lib/db/schema";
import { toApiError } from "@/lib/errors";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 세션의 슬라이드 비평 결과를 슬라이드 순서로 반환. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = getDb()
      .select()
      .from(slideCritiques)
      .where(eq(slideCritiques.sessionId, id))
      .orderBy(asc(slideCritiques.slideIndex))
      .all();
    return Response.json({
      critiques: rows.map((r) => ({
        slideIndex: r.slideIndex,
        textDensity: r.textDensity,
        estimatedReadTimeSec: r.estimatedReadTimeSec,
        issues: r.issues,
        suggestions: r.suggestions,
      })),
    });
  } catch (err) {
    const { status, body } = toApiError(err);
    return Response.json(body, { status });
  }
}
