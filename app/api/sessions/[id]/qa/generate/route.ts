import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { getQueue } from "@/lib/jobs";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** SCR-08: 예상 질문 생성(qa_generate) 작업 적재. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!getDb().select().from(sessions).where(eq(sessions.id, id)).get()) {
      throw Errors.notFound("세션을 찾을 수 없습니다");
    }
    const jobId = getQueue().enqueue("qa_generate", { sessionId: id }, id);
    return Response.json({ jobId }, { status: 202 });
  } catch (err) {
    return errorResponse(err);
  }
}
