import { getDb } from "@/lib/db";
import { recordings } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 녹음 메타데이터(세션 연결 등) 반환. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rec = getDb().select().from(recordings).where(eq(recordings.id, id)).get();
    if (!rec) throw Errors.notFound("녹음을 찾을 수 없습니다");
    return Response.json({
      id: rec.id,
      sessionId: rec.sessionId,
      scriptVersion: rec.scriptVersion,
      durationSec: rec.durationSec,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
