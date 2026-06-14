import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { Errors, toApiError } from "@/lib/errors";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 세션의 최신 스크립트(가장 높은 version)를 반환. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const row = getDb()
      .select()
      .from(scripts)
      .where(eq(scripts.sessionId, id))
      .orderBy(desc(scripts.version))
      .get();
    if (!row) throw Errors.notFound("스크립트가 아직 없습니다");
    return Response.json({ version: row.version, source: row.source, content: row.content });
  } catch (err) {
    const { status, body } = toApiError(err);
    return Response.json(body, { status });
  }
}
