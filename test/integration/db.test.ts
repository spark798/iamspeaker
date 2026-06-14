// 싱글턴(실제 파일 오픈) 우회를 위해 client/schema에서 직접 import.
import { type Db, createDb } from "@/lib/db/client";
import { scripts, sessions, slides } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeAll, describe, expect, it } from "vitest";

let db: Db;

beforeAll(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./lib/db/migrations" });
});

describe("db 스키마/마이그레이션", () => {
  it("세션→슬라이드→스크립트 삽입·조회 + JSON 컬럼 왕복 + 기본값/타임스탬프", () => {
    db.insert(sessions)
      .values({
        id: "s1",
        slideFilePath: "/data/uploads/x.pdf",
        targetDurationSec: 300,
        tone: "formal",
        nativeLanguage: "ko",
      })
      .run();
    db.insert(slides)
      .values({ id: "sl1", sessionId: "s1", slideIndex: 0, textContent: "Hello", notes: null })
      .run();
    db.insert(scripts)
      .values({
        id: "sc1",
        sessionId: "s1",
        version: 0,
        source: "ai_demo",
        content: [{ slideIndex: 0, text: "Hello investors" }],
      })
      .run();

    const got = db.select().from(scripts).where(eq(scripts.sessionId, "s1")).all();
    expect(got.length).toBe(1);
    expect(got[0]?.content[0]?.text).toBe("Hello investors"); // JSON 왕복
    expect(got[0]?.source).toBe("ai_demo");

    const sess = db.select().from(sessions).where(eq(sessions.id, "s1")).get();
    expect(sess?.language).toBe("en"); // 컬럼 기본값
    expect(sess?.createdAt).toBeInstanceOf(Date); // timestamp_ms → Date 매핑
  });

  it("foreign_keys=ON: 존재하지 않는 세션 참조 시 거부", () => {
    expect(() =>
      db
        .insert(slides)
        .values({ id: "bad", sessionId: "nope", slideIndex: 0, textContent: "x", notes: null })
        .run(),
    ).toThrow();
  });
});
