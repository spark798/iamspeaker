import type {
  QaGeneratorAdapter,
  ScriptGeneratorAdapter,
  SlideCriticAdapter,
  SttAdapter,
  SttInput,
  TtsAdapter,
  TtsResult,
} from "@/lib/ai/types";
import type {
  AnalysisResult,
  GenOptions,
  L1Profile,
  QAFeedback,
  QAItem,
  Script,
  ScriptDiff,
  SlideContent,
  SlideCritique,
  TranscriptResult,
} from "@/lib/domain";

/**
 * Stub 어댑터 — 실제 모델 없이 결정적(deterministic) 출력을 반환한다.
 * Walking Skeleton(M1)·CI·계약 테스트용. 실제 로컬/클라우드 구현은 Phase 1에서 추가.
 */

const QA_CATEGORIES = ["clarification", "challenge", "detail", "numbers"] as const;

/** 무음 16kHz mono 16-bit WAV 바이트를 생성(유효한 WAV 헤더 포함). */
function silentWav(samples = 1600, sampleRate = 16000): Uint8Array {
  const dataLen = samples * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataLen, true);
  return new Uint8Array(buf);
}

export class StubScriptGenerator implements ScriptGeneratorAdapter {
  async generate(slides: SlideContent[], _options: GenOptions): Promise<Script> {
    return {
      version: 0,
      source: "ai_demo",
      content: slides.map((s) => ({
        slideIndex: s.index,
        text: `[stub demo] ${s.textContent.slice(0, 80) || `Slide ${s.index + 1}`}`,
      })),
    };
  }

  async improve(script: Script, _analysis: AnalysisResult, _l1?: L1Profile): Promise<ScriptDiff> {
    return {
      baseVersion: script.version,
      entries: script.content.map((c) => ({
        slideIndex: c.slideIndex,
        original: c.text,
        improved: `${c.text} (improved)`,
        reason: "더 자연스러운 표현 (stub)",
      })),
    };
  }
}

export class StubTts implements TtsAdapter {
  async synthesize(_text: string, _lang: string): Promise<TtsResult> {
    return { audio: silentWav(), format: "wav", sampleRate: 16000 };
  }
}

export class StubStt implements SttAdapter {
  async transcribe(_input: SttInput): Promise<TranscriptResult> {
    const tokens = ["This", "is", "a", "stub", "transcript"];
    let t = 0;
    const words = tokens.map((word) => {
      const startSec = t;
      t += 0.4;
      return { word, startSec, endSec: t, confidence: 0.9 };
    });
    return { text: tokens.join(" "), words, durationSec: t, language: "en" };
  }
}

export class StubQaGenerator implements QaGeneratorAdapter {
  async generateQuestions(
    slides: SlideContent[],
    _script: Script,
    count: number,
  ): Promise<QAItem[]> {
    return Array.from({ length: count }, (_, i) => ({
      id: `stub-q-${i + 1}`,
      question: `Stub question ${i + 1}?`,
      relatedSlideIndex: slides.length > 0 ? i % slides.length : 0,
      difficulty: i % 2 === 0 ? "easy" : "tough",
      category: QA_CATEGORIES[i % QA_CATEGORIES.length] ?? "detail",
    }));
  }

  async evaluateAnswer(question: QAItem, _answer: TranscriptResult): Promise<QAFeedback> {
    return {
      questionId: question.id,
      wpm: 120,
      fillerWords: [],
      relevanceScore: 0.7,
      improvedAnswer: "Stub improved answer.",
    };
  }
}

export class StubSlideCritic implements SlideCriticAdapter {
  async analyze(slides: SlideContent[], _targetDurationSec: number): Promise<SlideCritique[]> {
    return slides.map((s) => {
      const len = s.textContent.length;
      const textDensity = len > 300 ? "high" : len > 100 ? "medium" : "low";
      return {
        slideIndex: s.index,
        textDensity,
        estimatedReadTimeSec: Math.ceil(len / 15),
        issues: [],
        suggestions: [],
      };
    });
  }
}
