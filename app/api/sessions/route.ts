import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { sessions, slides } from "@/lib/db/schema";
import { Errors, toApiError } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

// 셸/Walking Skeleton용: 슬라이드를 인라인으로 받는다. Phase 1에서 파일 업로드+파서로 대체.
const Body = z.object({
  targetDurationSec: z.number().int().positive(),
  tone: z.enum(["formal", "casual"]),
  language: z.string().min(1).default("en"),
  nativeLanguage: z.string().min(1).optional(),
  slides: z.array(z.object({ textContent: z.string(), notes: z.string().optional() })).min(1),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const db = getDb();
    const id = randomUUID();
    db.insert(sessions)
      .values({
        id,
        slideFilePath: "(inline)",
        targetDurationSec: body.targetDurationSec,
        tone: body.tone,
        language: body.language,
        nativeLanguage: body.nativeLanguage ?? null,
      })
      .run();
    body.slides.forEach((s, i) => {
      db.insert(slides)
        .values({
          id: randomUUID(),
          sessionId: id,
          slideIndex: i,
          textContent: s.textContent,
          notes: s.notes ?? null,
        })
        .run();
    });
    return Response.json({ id }, { status: 201 });
  } catch (err) {
    const mapped = err instanceof z.ZodError ? Errors.badRequest("입력이 올바르지 않습니다") : err;
    const { status, body } = toApiError(mapped);
    return Response.json(body, { status });
  }
}
