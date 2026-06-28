import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
// 도메인 타입(단일 진실원)을 JSON 컬럼 타입으로 재사용. drizzle-kit 친화 위해 상대 경로 import.
import type {
  Difficulty,
  FillerWordResult,
  Genre,
  JobStatus,
  JobType,
  PronunciationIssue,
  ProsodyResult,
  QACategory,
  RiskExpressionResult,
  ScriptSource,
  SlideScript,
  SlideTimeBreakdown,
  SlideTransition,
  TextDensity,
  Tone,
} from "../domain";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  createdAt: createdAt(),
  slideFilePath: text("slide_file_path").notNull(),
  targetDurationSec: integer("target_duration_sec").notNull(),
  tone: text("tone").$type<Tone>().notNull(),
  language: text("language").notNull().default("en"),
  nativeLanguage: text("native_language"),
  // 발표 장르 — 품질 기준선(B-001) 선택에 사용. talk(강연)/pitch(피칭)/lecture(강의).
  genre: text("genre").$type<Genre>().notNull().default("talk"),
  // 사용자 지정 목표(선택). null이면 장르 기준선에서 자동 도출. "내 코치" 개인화.
  goalWpmMin: integer("goal_wpm_min"),
  goalWpmMax: integer("goal_wpm_max"),
  goalFillerPerMin: real("goal_filler_per_min"),
});

export const slides = sqliteTable("slides", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  slideIndex: integer("slide_index").notNull(),
  textContent: text("text_content").notNull(),
  notes: text("notes"),
});

export const scripts = sqliteTable("scripts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  source: text("source").$type<ScriptSource>().notNull(),
  content: text("content", { mode: "json" }).$type<SlideScript[]>().notNull(),
});

/** 자막 병기용 스크립트 번역 캐시(scriptId + language별 1건). */
export const scriptTranslations = sqliteTable(
  "script_translations",
  {
    id: text("id").primaryKey(),
    scriptId: text("script_id")
      .notNull()
      .references(() => scripts.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    content: text("content", { mode: "json" }).$type<SlideScript[]>().notNull(),
    createdAt: createdAt(),
  },
  // (scriptId, language)당 캐시 1건 — 동시 토글 시 중복행 방지.
  (t) => [uniqueIndex("script_translations_script_lang").on(t.scriptId, t.language)],
);

export const recordings = sqliteTable("recordings", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  scriptVersion: integer("script_version").notNull(),
  audioFilePath: text("audio_file_path").notNull(),
  durationSec: real("duration_sec").notNull(),
  transitions: text("transitions", { mode: "json" })
    .$type<SlideTransition[]>()
    .notNull()
    .default(sql`'[]'`),
  createdAt: createdAt(),
});

export const analysisResults = sqliteTable("analysis_results", {
  id: text("id").primaryKey(),
  recordingId: text("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),
  wpm: real("wpm").notNull(),
  fillerWords: text("filler_words", { mode: "json" }).$type<FillerWordResult[]>().notNull(),
  slideTimeBreakdown: text("slide_time_breakdown", { mode: "json" })
    .$type<SlideTimeBreakdown[]>()
    .notNull(),
  pronunciationIssues: text("pronunciation_issues", { mode: "json" })
    .$type<PronunciationIssue[]>()
    .notNull(),
  // 전체 발음 점수 0~100(측정 불가 시 null). 단어별 정확도 평균.
  pronunciationScore: real("pronunciation_score"),
  pauseCount: integer("pause_count").notNull().default(0),
  // 신뢰도를 낮추는 위험 표현(hedging/모호어/사과). 기존 행 호환 위해 nullable.
  riskExpressions: text("risk_expressions", { mode: "json" }).$type<RiskExpressionResult[]>(),
  // 억양·강세(프로소디) — 피치/에너지 분석. nullable(측정 불가/구버전).
  prosody: text("prosody", { mode: "json" }).$type<ProsodyResult>(),
});

export const slideCritiques = sqliteTable("slide_critiques", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  slideIndex: integer("slide_index").notNull(),
  textDensity: text("text_density").$type<TextDensity>().notNull(),
  estimatedReadTimeSec: real("estimated_read_time_sec").notNull(),
  issues: text("issues", { mode: "json" }).$type<string[]>().notNull(),
  suggestions: text("suggestions", { mode: "json" }).$type<string[]>().notNull(),
});

export const qaSessions = sqliteTable("qa_sessions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

export const qaItems = sqliteTable("qa_items", {
  id: text("id").primaryKey(),
  qaSessionId: text("qa_session_id")
    .notNull()
    .references(() => qaSessions.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  relatedSlideIndex: integer("related_slide_index").notNull(),
  difficulty: text("difficulty").$type<Difficulty>().notNull(),
  category: text("category").$type<QACategory>().notNull(),
});

export const qaAnswers = sqliteTable("qa_answers", {
  id: text("id").primaryKey(),
  qaItemId: text("qa_item_id")
    .notNull()
    .references(() => qaItems.id, { onDelete: "cascade" }),
  audioFilePath: text("audio_file_path").notNull(),
  transcript: text("transcript").notNull(),
  wpm: real("wpm").notNull(),
  fillerWords: text("filler_words", { mode: "json" }).$type<FillerWordResult[]>().notNull(),
  relevanceScore: real("relevance_score").notNull(),
  improvedAnswer: text("improved_answer"),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  type: text("type").$type<JobType>().notNull(),
  sessionId: text("session_id"),
  status: text("status").$type<JobStatus>().notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  // 신뢰성(Q2): 재시도/dead-letter. attempt=실행 회차(claim 시 증가), maxAttempts=시도 한도.
  attempt: integer("attempt").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(1),
  // 백오프 재시도 시 이 시각 이후에만 claim 가능(null=즉시).
  nextRunAt: integer("next_run_at", { mode: "timestamp_ms" }),
  payload: text("payload", { mode: "json" }).$type<unknown>(),
  result: text("result", { mode: "json" }).$type<unknown>(),
  error: text("error"),
  createdAt: createdAt(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
});
