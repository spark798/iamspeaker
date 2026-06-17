import { type Db, getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { errorResponse } from "@/lib/errors";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * 작업 진행률 SSE 스트림. 클라이언트는 EventSource로 구독, 미지원 시 폴링 폴백.
 * 종료(succeeded/failed) 또는 클라이언트 중단/오류 시 스트림을 닫는다.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let db: Db;
  try {
    db = getDb();
  } catch (err) {
    return errorResponse(err);
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let interval: NodeJS.Timeout | null = null;
      let done = false;
      const close = () => {
        if (done) return;
        done = true;
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          // 이미 닫힘
        }
      };
      const send = (data: unknown) => {
        if (!done) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const tick = () => {
        try {
          const job = db.select().from(jobs).where(eq(jobs.id, id)).get();
          if (!job) {
            send({ error: "not_found" });
            close();
            return;
          }
          send({ id: job.id, status: job.status, progress: job.progress, error: job.error });
          if (job.status === "succeeded" || job.status === "failed") {
            close();
          }
        } catch {
          send({ error: "internal" });
          close();
        }
      };

      tick();
      interval = setInterval(tick, 500);
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
