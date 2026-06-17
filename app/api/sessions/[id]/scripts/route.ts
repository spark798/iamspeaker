import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { scripts, sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Body = z.object({
  content: z.array(z.object({ slideIndex: z.number().int(), text: z.string() })).min(1),
});

/** SCR-03: 편집된 스크립트를 사용자 버전으로 저장(새 version, source=user). 반환 {version}. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = Body.parse(await req.json());
    const db = getDb();

    const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
    if (!session) throw Errors.notFound("세션을 찾을 수 없습니다");

    const latest = db
      .select()
      .from(scripts)
      .where(eq(scripts.sessionId, id))
      .orderBy(desc(scripts.version))
      .get();
    const version = latest ? latest.version + 1 : 1;

    db.insert(scripts)
      .values({ id: randomUUID(), sessionId: id, version, source: "user", content: body.content })
      .run();

    return Response.json({ version }, { status: 201 });
  } catch (err) {
    const mapped =
      err instanceof z.ZodError ? Errors.badRequest("스크립트 형식이 올바르지 않습니다") : err;
    return errorResponse(mapped);
  }
}
