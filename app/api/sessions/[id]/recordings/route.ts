import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db";
import { recordings, sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { getQueue } from "@/lib/jobs";
import { rateLimitGuard } from "@/lib/ratelimit";
import { ensureDir, recordingDir, recordingPath } from "@/lib/storage";
import { assertSizeWithinLimit, validateUploadFile } from "@/lib/upload/validate";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AUDIO_EXT = ["webm", "wav", "m4a", "mp3", "ogg", "oga", "opus", "mp4", "aac"];

const Meta = z.object({
  scriptVersion: z.coerce.number().int().nonnegative(),
  transitions: z
    .string()
    .default("[]")
    .transform((s, ctx) => {
      try {
        return z
          .array(z.object({ slideIndex: z.number().int(), atSec: z.number().nonnegative() }))
          .parse(JSON.parse(s));
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "transitions 형식 오류" });
        return z.NEVER;
      }
    }),
});

/** SCR-04: 녹음 업로드 → storage 저장 → recordings 행 + analyze 잡 적재. 반환 {recordingId, jobId}. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = rateLimitGuard(req, "recordings");
    if (limited) return limited;
    const { id } = await params;
    const db = getDb();
    if (!db.select().from(sessions).where(eq(sessions.id, id)).get()) {
      throw Errors.notFound("세션을 찾을 수 없습니다");
    }

    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) throw Errors.badRequest("오디오 파일이 필요합니다");
    assertSizeWithinLimit(file.size, config.MAX_UPLOAD_MB * 1024 * 1024);
    const meta = Meta.parse({
      scriptVersion: form.get("scriptVersion"),
      transitions: form.get("transitions") ?? undefined,
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = validateUploadFile(file.name, bytes, {
      allowedExt: AUDIO_EXT,
      maxBytes: config.MAX_UPLOAD_MB * 1024 * 1024,
    });

    const recordingId = randomUUID();
    ensureDir(recordingDir(id));
    const audioFilePath = recordingPath(id, recordingId, ext);
    writeFileSync(audioFilePath, bytes);

    db.insert(recordings)
      .values({
        id: recordingId,
        sessionId: id,
        scriptVersion: meta.scriptVersion,
        audioFilePath,
        durationSec: 0,
        transitions: meta.transitions,
      })
      .run();

    const jobId = getQueue().enqueue("analyze", { recordingId }, id);
    return Response.json({ recordingId, jobId }, { status: 201 });
  } catch (err) {
    const mapped =
      err instanceof z.ZodError ? Errors.badRequest("녹음 메타데이터가 올바르지 않습니다") : err;
    return errorResponse(mapped);
  }
}
