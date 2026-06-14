/** STT 단어 단위 결과 (발음·시간배분 분석에 필수). */
export interface TranscriptWord {
  word: string;
  startSec: number;
  endSec: number;
  /** 0~1, 낮을수록 발음 의심. */
  confidence: number;
}

/** STT 전사 결과 (STTAdapter.transcribe 출력). */
export interface TranscriptResult {
  text: string;
  words: TranscriptWord[];
  durationSec: number;
  language?: string;
}

/** 필러워드 분석 결과 (단어별 빈도·발생 위치). */
export interface FillerWordResult {
  word: string;
  count: number;
  /** 발생 위치(초). */
  timestamps: number[];
}
