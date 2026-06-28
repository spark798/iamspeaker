import type {
  AnalysisResult,
  L1Profile,
  QAItem,
  Script,
  SlideCritique,
  TranscriptResult,
} from "@/lib/domain";
import { describe, expect, it } from "vitest";

// 배럴 export가 연결돼 있고 타입 형태가 일관됨을 컴파일 타임 + 최소 런타임으로 검증.
describe("domain 배럴 export", () => {
  it("샘플 객체가 타입에 부합한다", () => {
    const script: Script = {
      version: 0,
      source: "ai_demo",
      content: [{ slideIndex: 0, text: "Hello investors." }],
    };

    const transcript: TranscriptResult = {
      text: "Hello investors",
      durationSec: 2.1,
      words: [{ word: "Hello", startSec: 0, endSec: 0.5, confidence: 0.97 }],
    };

    const analysis: AnalysisResult = {
      wpm: 120,
      fillerWords: [{ word: "um", count: 2, timestamps: [1.2, 3.4] }],
      slideTimeBreakdown: [{ slideIndex: 0, durationSec: 2.1 }],
      pronunciationIssues: [
        {
          word: "investors",
          expectedSound: "ɪnˈvɛstərz",
          confidence: 0.6,
          timestamp: 1.0,
          l1Related: true,
        },
      ],
      pauseCount: 3,
      riskExpressions: [],
      prosody: null,
    };

    const qa: QAItem = {
      id: "q1",
      question: "How will you reach $1M ARR?",
      relatedSlideIndex: 2,
      difficulty: "tough",
      category: "numbers",
    };

    const l1: L1Profile = {
      language: "ko",
      commonPronunciationIssues: [
        { targetPhoneme: "f", commonSubstitution: "p", description: "f→p 치환" },
      ],
      commonExpressionIssues: [
        { pattern: "\\b(a|an|the)?\\b", issue: "관사 누락", suggestion: "관사 추가 검토" },
      ],
    };

    const critique: SlideCritique = {
      slideIndex: 0,
      textDensity: "high",
      estimatedReadTimeSec: 40,
      issues: ["텍스트가 많아 읽기만 하게 될 수 있음"],
      suggestions: ["핵심 3줄로 축약"],
    };

    expect(script.source).toBe("ai_demo");
    expect(transcript.words[0]?.confidence).toBeGreaterThan(0.9);
    expect(analysis.pronunciationIssues[0]?.l1Related).toBe(true);
    expect(qa.difficulty).toBe("tough");
    expect(l1.language).toBe("ko");
    expect(critique.textDensity).toBe("high");
  });
});
