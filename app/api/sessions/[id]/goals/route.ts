import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { rateLimitGuard } from "@/lib/ratelimit";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

// 각 필드 nullable: null이면 기준선으로 초기화, 미포함이면 그대로 둠.
const Body = z
  .object({
    goalWpmMin: z.number().int().positive().nullable().optional(),
    goalWpmMax: z.number().int().positive().nullable().optional(),
    goalFillerPerMin: z.number().nonnegative().nullable().optional(),
  })
  .refine((b) => b.goalWpmMin == null || b.goalWpmMax == null || b.goalWpmMin <= b.goalWpmMax, {
    message: "goalWpmMin은 goalWpmMax 이하여야 합니다",
  });

/** 세션의 사용자 지정 연습 목표 갱신(개인화). 제공된 필드만 반영(null=기준선 초기화). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = rateLimitGuard(req, "session-goals");
    if (limited) return limited;
    const { id } = await params;
    const db = getDb();
    if (!db.select().from(sessions).where(eq(sessions.id, id)).get()) {
      throw Errors.notFound("세션을 찾을 수 없습니다");
    }
    const body = Body.parse(await req.json());

    // 명시적으로 전달된 키만 set(undefined는 변경 안 함).
    const patch: Partial<typeof sessions.$inferInsert> = {};
    if ("goalWpmMin" in body) patch.goalWpmMin = body.goalWpmMin ?? null;
    if ("goalWpmMax" in body) patch.goalWpmMax = body.goalWpmMax ?? null;
    if ("goalFillerPerMin" in body) patch.goalFillerPerMin = body.goalFillerPerMin ?? null;
    if (Object.keys(patch).length > 0) {
      db.update(sessions).set(patch).where(eq(sessions.id, id)).run();
    }
    return Response.json({ ok: true });
  } catch (err) {
    const mapped =
      err instanceof z.ZodError ? Errors.badRequest("목표 값이 올바르지 않습니다") : err;
    return errorResponse(mapped);
  }
}
