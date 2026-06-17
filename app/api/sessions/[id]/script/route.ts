import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 세션 스크립트 반환. `?version=N`이면 특정 버전, 없으면 최신(최고 version). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const versionParam = new URL(req.url).searchParams.get("version");
    const db = getDb();
    const base = db.select().from(scripts);
    const row =
      versionParam !== null
        ? base
            .where(and(eq(scripts.sessionId, id), eq(scripts.version, Number(versionParam))))
            .get()
        : base.where(eq(scripts.sessionId, id)).orderBy(desc(scripts.version)).get();
    if (!row) throw Errors.notFound("스크립트가 아직 없습니다");
    return Response.json({ version: row.version, source: row.source, content: row.content });
  } catch (err) {
    return errorResponse(err);
  }
}
