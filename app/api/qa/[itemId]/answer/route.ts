import { writeFileSync } from "node:fs";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db";
import { qaAnswers, qaItems, qaSessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { getQueue } from "@/lib/jobs";
import { rateLimitGuard } from "@/lib/ratelimit";
import { ensureDir, recordingDir, recordingPath } from "@/lib/storage";
import { validateUploadFile } from "@/lib/upload/validate";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const AUDIO_EXT = ["webm", "wav", "m4a", "mp3", "ogg", "oga", "opus", "mp4", "aac"];

/** SCR-08b: 답변 오디오 업로드 → 저장 → qa_evaluate 잡 적재. */
export async function POST(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const limited = rateLimitGuard(req, "answer");
    if (limited) return limited;
    const { itemId } = await params;
    const db = getDb();
    const item = db.select().from(qaItems).where(eq(qaItems.id, itemId)).get();
    if (!item) throw Errors.notFound("질문을 찾을 수 없습니다");
    const qs = db.select().from(qaSessions).where(eq(qaSessions.id, item.qaSessionId)).get();
    if (!qs) throw Errors.notFound("Q&A 세션을 찾을 수 없습니다");

    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) throw Errors.badRequest("오디오 파일이 필요합니다");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = validateUploadFile(file.name, bytes, {
      allowedExt: AUDIO_EXT,
      maxBytes: config.MAX_UPLOAD_MB * 1024 * 1024,
    });

    ensureDir(recordingDir(qs.sessionId));
    const audioFilePath = recordingPath(qs.sessionId, `qa-${itemId}`, ext);
    writeFileSync(audioFilePath, bytes);

    const jobId = getQueue().enqueue(
      "qa_evaluate",
      { qaItemId: itemId, audioFilePath },
      qs.sessionId,
    );
    return Response.json({ jobId }, { status: 202 });
  } catch (err) {
    return errorResponse(err);
  }
}

/** 답변 평가 결과 반환(없으면 404). */
export async function GET(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const row = getDb().select().from(qaAnswers).where(eq(qaAnswers.qaItemId, itemId)).get();
    if (!row) throw Errors.notFound("답변이 아직 없습니다");
    return Response.json({
      transcript: row.transcript,
      wpm: row.wpm,
      fillerWords: row.fillerWords,
      relevanceScore: row.relevanceScore,
      improvedAnswer: row.improvedAnswer,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
