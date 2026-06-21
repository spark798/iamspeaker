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
 * AI 어댑터 인터페이스 — 단일 진실원.
 * 모든 외부 모델 호출(LLM/TTS/STT)은 이 인터페이스 뒤에 둔다. 직접 호출 금지(CLAUDE.md §2).
 * 기본 구현은 로컬/오픈소스, 클라우드는 선택적. 테스트/CI/Walking-Skeleton은 stub 구현 사용.
 */

/** TTS 합성 결과 (서버 측 오디오 바이트). */
export interface TtsResult {
  audio: Uint8Array;
  format: string; // 예: "wav"
  sampleRate?: number;
}

/** STT 입력 — 오디오 파이프라인이 만든 16kHz mono WAV 파일 경로. */
export interface SttInput {
  wavFilePath: string;
}

export interface ScriptGeneratorAdapter {
  generate(slides: SlideContent[], options: GenOptions): Promise<Script>;
  improve(script: Script, analysis: AnalysisResult, l1Profile?: L1Profile): Promise<ScriptDiff>;
}

export interface TtsAdapter {
  synthesize(text: string, lang: string): Promise<TtsResult>;
}

export interface SttAdapter {
  transcribe(input: SttInput): Promise<TranscriptResult>;
}

export interface QaGeneratorAdapter {
  generateQuestions(slides: SlideContent[], script: Script, count: number): Promise<QAItem[]>;
  evaluateAnswer(question: QAItem, answerTranscript: TranscriptResult): Promise<QAFeedback>;
}

export interface SlideCriticAdapter {
  analyze(slides: SlideContent[], targetDurationSec: number): Promise<SlideCritique[]>;
}

/** 자막 병기용 번역기. 입력 순서·길이를 보존해 반환한다. */
export interface TranslatorAdapter {
  translate(texts: string[], targetLang: string, sourceLang: string): Promise<string[]>;
}

/** 전체 어댑터 묶음. */
export interface Adapters {
  script: ScriptGeneratorAdapter;
  tts: TtsAdapter;
  stt: SttAdapter;
  qa: QaGeneratorAdapter;
  slideCritic: SlideCriticAdapter;
  translator: TranslatorAdapter;
}
