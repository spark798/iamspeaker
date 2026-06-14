/**
 * 개발용 시드: 샘플 세션 + 슬라이드를 DB에 삽입. 실행: `pnpm db:seed`
 * (이후 그 sessionId로 데모 작업 등을 시험할 수 있다)
 */
import { randomUUID } from "node:crypto";

try {
  process.loadEnvFile(".env");
} catch {
  // .env 없으면 기본값
}

const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
const { getDb } = await import("../lib/db");
const { sessions, slides } = await import("../lib/db/schema");
const { SAMPLE_SLIDES } = await import("../lib/samples");

const db = getDb();
migrate(db, { migrationsFolder: "./lib/db/migrations" });

const id = randomUUID();
db.insert(sessions)
  .values({
    id,
    slideFilePath: "(seed)",
    targetDurationSec: 180,
    tone: "formal",
    language: "en",
    nativeLanguage: "ko",
  })
  .run();
SAMPLE_SLIDES.forEach((s, i) => {
  db.insert(slides)
    .values({
      id: randomUUID(),
      sessionId: id,
      slideIndex: i,
      textContent: s.textContent,
      notes: null,
    })
    .run();
});

console.log(`✅ seed 세션 생성: ${id} (슬라이드 ${SAMPLE_SLIDES.length}장)`);
