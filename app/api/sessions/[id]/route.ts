import { rmSync } from "node:fs";
import { getDb } from "@/lib/db";
import { jobs, sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { rateLimitGuard } from "@/lib/ratelimit";
import { recordingDir, ttsDir, uploadDir } from "@/lib/storage";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * 세션 삭제. DB 자식 행은 FK cascade(slides·scripts·recordings·analysis·qa…)로 제거되고,
 * 비-FK 잡과 디스크 파일(업로드·녹음·TTS)도 정리한다(프라이버시 — 내 데이터는 내 것).
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = rateLimitGuard(req, "session-delete");
    if (limited) return limited;
    const { id } = await params;
    const db = getDb();
    if (!db.select().from(sessions).where(eq(sessions.id, id)).get()) {
      throw Errors.notFound("세션을 찾을 수 없습니다");
    }

    db.delete(sessions).where(eq(sessions.id, id)).run(); // 자식 행 cascade
    db.delete(jobs).where(eq(jobs.sessionId, id)).run(); // 잡은 FK 아님 → 직접 정리

    // 세션 스코프 디스크 디렉토리 제거(경로는 assertSafeSegment로 검증됨).
    for (const dir of [uploadDir(id), recordingDir(id), ttsDir(id)]) {
      rmSync(dir, { recursive: true, force: true });
    }
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
