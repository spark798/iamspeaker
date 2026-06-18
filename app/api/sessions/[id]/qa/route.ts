import { getDb } from "@/lib/db";
import { qaItems, qaSessions } from "@/lib/db/schema";
import { errorResponse } from "@/lib/errors";
import { asc, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 세션의 최신 Q&A 세션 질문 목록을 반환(없으면 빈 배열). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const qs = db
      .select()
      .from(qaSessions)
      .where(eq(qaSessions.sessionId, id))
      .orderBy(desc(qaSessions.createdAt))
      .get();
    if (!qs) return Response.json({ questions: [] });
    const items = db
      .select()
      .from(qaItems)
      .where(eq(qaItems.qaSessionId, qs.id))
      .orderBy(asc(qaItems.relatedSlideIndex))
      .all();
    return Response.json({
      questions: items.map((q) => ({
        id: q.id,
        question: q.question,
        relatedSlideIndex: q.relatedSlideIndex,
        difficulty: q.difficulty,
        category: q.category,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
