import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { getDb } from "@/lib/db";
import { recordings, sessions, slides } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { rateLimitGuard } from "@/lib/ratelimit";
import { desc } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** 대시보드용 세션 목록 — 회차 수·마지막 연습 시각 포함, 최신순. */
export async function GET() {
  try {
    const db = getDb();
    const ses = db.select().from(sessions).orderBy(desc(sessions.createdAt)).all();
    const recs = db
      .select({ sessionId: recordings.sessionId, createdAt: recordings.createdAt })
      .from(recordings)
      .all();
    const bySession = new Map<string, { count: number; last: number }>();
    for (const r of recs) {
      const ts = r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt);
      const cur = bySession.get(r.sessionId) ?? { count: 0, last: 0 };
      cur.count++;
      cur.last = Math.max(cur.last, ts);
      bySession.set(r.sessionId, cur);
    }
    const list = ses.map((s) => {
      const agg = bySession.get(s.id);
      const fileName =
        s.slideFilePath && s.slideFilePath !== "(inline)" ? basename(s.slideFilePath) : null;
      return {
        id: s.id,
        createdAt: s.createdAt instanceof Date ? s.createdAt.getTime() : Number(s.createdAt),
        genre: s.genre,
        targetDurationSec: s.targetDurationSec,
        language: s.language,
        nativeLanguage: s.nativeLanguage,
        slideFileName: fileName,
        recordingCount: agg?.count ?? 0,
        lastPracticedAt: agg?.last ?? null,
      };
    });
    return Response.json({ sessions: list });
  } catch (err) {
    return errorResponse(err);
  }
}

// 셸/Walking Skeleton용: 슬라이드를 인라인으로 받는다. Phase 1에서 파일 업로드+파서로 대체.
const Body = z.object({
  targetDurationSec: z.number().int().positive(),
  tone: z.enum(["formal", "casual"]),
  language: z.string().min(1).default("en"),
  nativeLanguage: z.string().min(1).optional(),
  genre: z.enum(["talk", "pitch", "lecture"]).default("talk"),
  slides: z.array(z.object({ textContent: z.string(), notes: z.string().optional() })).min(1),
});

export async function POST(req: Request) {
  try {
    const limited = rateLimitGuard(req, "session-create");
    if (limited) return limited;
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
        genre: body.genre,
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
    return errorResponse(mapped);
  }
}
