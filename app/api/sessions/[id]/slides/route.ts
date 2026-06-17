import { getDb } from "@/lib/db";
import { slides } from "@/lib/db/schema";
import { errorResponse } from "@/lib/errors";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 세션의 슬라이드(본문/노트)를 순서대로 반환. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = getDb()
      .select()
      .from(slides)
      .where(eq(slides.sessionId, id))
      .orderBy(asc(slides.slideIndex))
      .all();
    return Response.json({
      slides: rows.map((r) => ({
        index: r.slideIndex,
        textContent: r.textContent,
        notes: r.notes,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
