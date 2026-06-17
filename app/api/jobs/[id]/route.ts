import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 작업 상태(폴링 폴백용 단건 조회). 스트리밍은 /api/jobs/[id]/stream. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = getDb().select().from(jobs).where(eq(jobs.id, id)).get();
    if (!job) throw Errors.notFound("작업을 찾을 수 없습니다");
    return Response.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
