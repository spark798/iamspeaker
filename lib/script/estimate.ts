/** 발표 예상 시간 추정(순수 함수). 기본 130 WPM(영어 발표 평균치). */

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** 여러 세그먼트의 총 발화 예상 시간(초). */
export function estimateSpeakingSec(texts: string[], wpm = 130): number {
  const words = texts.reduce((n, t) => n + countWords(t), 0);
  if (wpm <= 0) return 0;
  return Math.round((words / wpm) * 60);
}
