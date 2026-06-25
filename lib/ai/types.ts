import type {
  AnalysisResult,
  Cue,
  GenOptions,
  L1Profile,
  PronunciationIssue,
  QAFeedback,
  QAItem,
  Script,
  ScriptDiff,
  SlideContent,
  SlideCritique,
  TranscriptResult,
  TranscriptWord,
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
  improve(
    script: Script,
    analysis: AnalysisResult,
    l1Profile?: L1Profile,
    cues?: Cue[],
  ): Promise<ScriptDiff>;
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

/** 발음 평가 입력 — 정규화 WAV + 전사 단어 + (선택) 대본 참조/L1 프로필. */
export interface PronunciationInput {
  wavFilePath: string;
  /** 전사 단어(휴리스틱·폴백용). */
  words: TranscriptWord[];
  /** 대본(스크립트) 텍스트 — wav2vec2 GOP의 정렬 참조(의도한 발음). */
  referenceText?: string;
  l1Profile?: L1Profile;
}

/** 발음 평가 결과 — 교정 대상 이슈 + 전체 발음 점수(0~100, 측정 불가 시 null). */
export interface PronunciationResult {
  issues: PronunciationIssue[];
  /** 전체 발음 점수 0~100 = 평균 단어 정확도 ×100. 평가 단어가 없으면 null. */
  score: number | null;
}

/**
 * 발음 이슈 검출기. 기본은 휴리스틱(STT confidence + L1 음소 교차, 의존성 0).
 * 선택적으로 wav2vec2 음향 평가로 교체(env 게이트). 항상 로컬 폴백.
 */
export interface PronunciationScorerAdapter {
  detect(input: PronunciationInput): Promise<PronunciationResult>;
}

/** 전체 어댑터 묶음. */
export interface Adapters {
  script: ScriptGeneratorAdapter;
  tts: TtsAdapter;
  stt: SttAdapter;
  qa: QaGeneratorAdapter;
  slideCritic: SlideCriticAdapter;
  translator: TranslatorAdapter;
  pronunciation: PronunciationScorerAdapter;
}
