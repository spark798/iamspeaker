/** 모국어 화자가 자주 틀리는 발음 규칙 (예: 종성, 강세 위치). */
export interface PhonemeRule {
  targetPhoneme: string;
  commonSubstitution: string;
  description: string;
}

/** 모국어 화자가 자주 틀리는 표현 규칙 (예: 관사 누락, 전치사 오류). */
export interface ExpressionRule {
  /** 감지 패턴 (정규식 또는 LLM 프롬프트 힌트). */
  pattern: string;
  issue: string;
  suggestion: string;
}

/** 사용자 모국어 기반 오류 패턴 프로필 (lib/ai/l1-profiles/<lang>.json). */
export interface L1Profile {
  /** 'ko' | 'ja' | 'zh' ... */
  language: string;
  commonPronunciationIssues: PhonemeRule[];
  commonExpressionIssues: ExpressionRule[];
}
