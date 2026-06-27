import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getAdapters } from "@/lib/ai/factory";
import { getDb } from "@/lib/db";
import { scripts, sessions } from "@/lib/db/schema";
import { Errors, errorResponse } from "@/lib/errors";
import { demoAudioPath } from "@/lib/storage";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * SCR-02: 데모 스크립트의 한 슬라이드를 TTS로 합성해 WAV로 스트리밍.
 * `?slide=<index>` 필수, `?version=N` 선택(없으면 최신). 결과는 디스크 캐시(버전·슬라이드별) 후 재사용.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const slideParam = url.searchParams.get("slide");
    if (slideParam === null) throw Errors.badRequest("slide 파라미터가 필요합니다");
    const slideIndex = Number(slideParam);
    if (!Number.isInteger(slideIndex) || slideIndex < 0) {
      throw Errors.badRequest("slide는 0 이상의 정수여야 합니다");
    }

    const voiceParam = url.searchParams.get("voice");
    if (voiceParam !== null && voiceParam !== "female" && voiceParam !== "male") {
      throw Errors.badRequest("voice는 female 또는 male이어야 합니다");
    }
    const voice: "female" | "male" = voiceParam === "male" ? "male" : "female";

    const db = getDb();
    const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
    if (!session) throw Errors.notFound("세션을 찾을 수 없습니다");

    const versionParam = url.searchParams.get("version");
    const scriptRow =
      versionParam !== null
        ? db
            .select()
            .from(scripts)
            .where(and(eq(scripts.sessionId, id), eq(scripts.version, Number(versionParam))))
            .get()
        : db
            .select()
            .from(scripts)
            .where(eq(scripts.sessionId, id))
            .orderBy(desc(scripts.version))
            .get();
    if (!scriptRow) throw Errors.notFound("스크립트가 아직 없습니다");

    const slideScript = scriptRow.content.find((s) => s.slideIndex === slideIndex);
    if (!slideScript || !slideScript.text.trim()) {
      throw Errors.notFound("해당 슬라이드의 스크립트가 없습니다");
    }

    const cachePath = demoAudioPath(id, scriptRow.version, slideIndex, voice);
    let audio: Uint8Array;
    if (existsSync(cachePath)) {
      audio = new Uint8Array(readFileSync(cachePath));
    } else {
      const result = await getAdapters().tts.synthesize(slideScript.text, session.language, voice);
      audio = result.audio;
      mkdirSync(dirname(cachePath), { recursive: true });
      writeFileSync(cachePath, audio);
    }

    // Uint8Array<ArrayBufferLike> → 명시적 ArrayBuffer 복사(BodyInit 타입 안전).
    const body = new ArrayBuffer(audio.byteLength);
    new Uint8Array(body).set(audio);
    return new Response(body, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
