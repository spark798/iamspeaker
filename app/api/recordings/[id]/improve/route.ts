import { getDb } from "@/lib/db";
import { recordings } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { getQueue } from "@/lib/jobs";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** SCR-06: 개선 제안(improve) 작업을 큐에 넣고 jobId 반환. 결과 diff는 /api/jobs/[jobId]의 result. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rec = getDb().select().from(recordings).where(eq(recordings.id, id)).get();
    if (!rec) throw Errors.notFound("녹음을 찾을 수 없습니다");
    const jobId = getQueue().enqueue("improve", { recordingId: id }, rec.sessionId);
    return Response.json({ jobId }, { status: 202 });
  } catch (err) {
    return errorResponse(err);
  }
}
