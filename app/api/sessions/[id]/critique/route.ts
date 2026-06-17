import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { getQueue } from "@/lib/jobs";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** SCR-01b: 슬라이드 분석(critique) 작업을 큐에 넣고 jobId 반환. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getDb().select().from(sessions).where(eq(sessions.id, id)).get();
    if (!session) throw Errors.notFound("세션을 찾을 수 없습니다");
    const jobId = getQueue().enqueue("critique", { sessionId: id }, id);
    return Response.json({ jobId }, { status: 202 });
  } catch (err) {
    return errorResponse(err);
  }
}
