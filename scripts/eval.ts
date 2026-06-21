/**
 * 회귀 eval (B-001 활용3) — Script Generator 품질 퇴보 감지.
 * 실행: `pnpm eval` (기본 stub=결정적 스모크) / `USE_STUB_ADAPTERS= OLLAMA_LIVE=1 OLLAMA_MODEL=<tag> pnpm eval` (실모델 품질).
 *
 * 고정 입력 덱 × Script Generator → scoreScriptQuality(커버리지·페이싱) → 임계 게이트.
 * 프롬프트/모델 변경 후 돌려 품질이 임계 밑으로 떨어지면 exit 1. Reviewer가 변경 PR에서 참조(docs/automation.md).
 */
import type { Genre, SlideContent } from "@/lib/domain";

try {
  process.loadEnvFile(".env");
} catch {
  // .env 없으면 기본값
}

const { getAdapters } = await import("../lib/ai/factory");
const { loadBaseline } = await import("../lib/analysis/baselines");
const { scoreScriptQuality } = await import("../lib/eval/script-quality");

interface Fixture {
  name: string;
  genre: Genre;
  targetDurationSec: number;
  nonNative: boolean;
  slides: SlideContent[];
}

const slide = (index: number, textContent: string): SlideContent => ({
  index,
  textContent,
  notes: null,
});

const FIXTURES: Fixture[] = [
  {
    name: "투자 피칭 (5분, ko 화자)",
    genre: "pitch",
    targetDurationSec: 300,
    nonNative: true,
    slides: [
      slide(0, "Problem: SMB churn is 8% monthly, costing $2B annually"),
      slide(1, "Solution: predictive ML flags at-risk accounts 30 days early"),
      slide(2, "Traction: 120 customers, $1.2M ARR, 15% MoM growth"),
      slide(3, "Market: $14B SAM, expanding to APAC in 2027"),
      slide(4, "Team: ex-Stripe, ex-Datadog founders"),
      slide(5, "Ask: $5M Series A for GTM and engineering"),
    ],
  },
  {
    name: "기술 강연 (10분)",
    genre: "talk",
    targetDurationSec: 600,
    nonNative: false,
    slides: [
      slide(0, "Why local-first AI matters for privacy"),
      slide(1, "The adapter pattern: swap local and cloud freely"),
      slide(2, "Whisper.cpp for on-device speech recognition"),
      slide(3, "Piper for fast offline TTS"),
      slide(4, "Measuring delivery: WPM, pauses, fillers"),
      slide(5, "Closing: own your data, own your practice"),
    ],
  },
  {
    name: "짧은 데모 (2분)",
    genre: "talk",
    targetDurationSec: 120,
    nonNative: false,
    slides: [
      slide(0, "iamspeaker in 90 seconds"),
      slide(1, "Upload slides, get an AI demo talk"),
      slide(2, "Record, analyze, improve"),
    ],
  },
];

/**
 * 하드 게이트 = 커버리지(모든 슬라이드가 비어있지 않은 출력). 깨진 프롬프트/모델·누락 슬라이드를 잡는
 * 견고한 회귀 신호이며 현재 main에서 green이라 "이후 하락"을 감지할 수 있다.
 * 페이싱(estimatedWpm/overall)은 *품질* 지표로 정보성 출력만 — 개선은 B-001 활용2(자가개선 루프) 범위.
 */
const MIN_COVERAGE = 0.95;

const gen = getAdapters().script;
console.log("\n  iamspeaker 회귀 eval — Script Generator 품질\n");

let failures = 0;
for (const f of FIXTURES) {
  const baseline = loadBaseline(f.genre);
  try {
    const script = await gen.generate(f.slides, {
      targetDurationSec: f.targetDurationSec,
      tone: "formal",
      language: "en",
      nativeLanguage: f.nonNative ? "ko" : undefined,
    });
    const q = scoreScriptQuality(f.slides, script, f.targetDurationSec, baseline, f.nonNative);
    const ok = q.coverage >= MIN_COVERAGE;
    if (!ok) failures++;
    console.log(`  ${ok ? "✅" : "❌"} ${f.name}  (coverage=${q.coverage})`);
    console.log(
      `       품질(정보): overall=${q.overall} · ${q.estimatedWpm}wpm(${q.wpmBand}, ${q.wpmScore}점) · ${q.totalWords}단어\n`,
    );
  } catch (err) {
    failures++;
    console.log(
      `  ❌ ${f.name} — 생성 실패: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
}

console.log(`  하드 게이트 coverage>=${MIN_COVERAGE} · 실패 ${failures}/${FIXTURES.length}`);
console.log("  (페이싱/overall은 품질 지표 — 개선은 활용2 자가개선 루프 범위)\n");
if (failures > 0) process.exit(1);
