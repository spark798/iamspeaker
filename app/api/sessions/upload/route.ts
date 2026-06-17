import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { getQueue } from "@/lib/jobs";
import { ensureDir, safeFilename, uploadDir, uploadPath } from "@/lib/storage";
import { validateUploadFile } from "@/lib/upload/validate";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Settings = z.object({
  targetDurationSec: z.coerce.number().int().positive(),
  tone: z.enum(["formal", "casual"]),
  language: z.string().min(1).default("en"),
  nativeLanguage: z.string().min(1).optional(),
});

/** SCR-01: 파일 업로드 → storage 저장 → 세션 생성 → parse 잡 적재. 반환 {sessionId, jobId}. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw Errors.badRequest("파일이 필요합니다");

    const settings = Settings.parse({
      targetDurationSec: form.get("targetDurationSec"),
      tone: form.get("tone"),
      language: form.get("language") ?? undefined,
      nativeLanguage: form.get("nativeLanguage") ?? undefined,
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    validateUploadFile(file.name, bytes, {
      allowedExt: config.ALLOWED_UPLOAD_EXT,
      maxBytes: config.MAX_UPLOAD_MB * 1024 * 1024,
    });

    const sessionId = randomUUID();
    ensureDir(uploadDir(sessionId));
    const filePath = uploadPath(sessionId, safeFilename(file.name));
    writeFileSync(filePath, bytes);

    getDb()
      .insert(sessions)
      .values({
        id: sessionId,
        slideFilePath: filePath,
        targetDurationSec: settings.targetDurationSec,
        tone: settings.tone,
        language: settings.language,
        nativeLanguage: settings.nativeLanguage ?? null,
      })
      .run();

    const jobId = getQueue().enqueue("parse", { sessionId, filePath }, sessionId);
    return Response.json({ sessionId, jobId }, { status: 201 });
  } catch (err) {
    const mapped = err instanceof z.ZodError ? Errors.badRequest("설정이 올바르지 않습니다") : err;
    return errorResponse(mapped);
  }
}
