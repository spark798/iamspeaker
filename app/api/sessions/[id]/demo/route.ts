import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { Errors, toApiError } from "@/lib/errors";
import { getQueue } from "@/lib/jobs";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** AI 데모 생성 작업을 큐에 넣고 jobId를 반환. 진행률은 /api/jobs/[jobId]/stream(SSE) 또는 /api/jobs/[jobId]. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getDb().select().from(sessions).where(eq(sessions.id, id)).get();
    if (!session) throw Errors.notFound("세션을 찾을 수 없습니다");
    const jobId = getQueue().enqueue("demo", { sessionId: id }, id);
    return Response.json({ jobId }, { status: 202 });
  } catch (err) {
    const { status, body } = toApiError(err);
    return Response.json(body, { status });
  }
}
