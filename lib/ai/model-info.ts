/**
 * 로컬 LLM 모델 태그에서 파라미터 규모를 추정해 "소형 모델" 여부를 판정한다(Q1-5 인앱 기대치 안내).
 * 소형 로컬 모델은 데모 분량·번역 품질이 제한적이므로 UI에서 더 큰 모델/클라우드 업그레이드를 안내한다.
 */

/**
 * Ollama 태그(`llama3.1:8b`, `qwen2.5:14b`, `hermes3:8b` …)에서 콜론 뒤 크기(B)를 파싱.
 * 버전 숫자(예: 3.1)를 크기로 오인하지 않도록 콜론 뒤 토큰만 본다. 없으면 null.
 */
export function parseModelSizeB(model: string): number | null {
  const m = /:(\d+(?:\.\d+)?)\s*b\b/i.exec(model);
  return m ? Number(m[1]) : null;
}

/**
 * 소형 로컬 모델 판정: 로컬(ollama) 엔진이고 파싱된 크기가 임계 미만일 때만 true.
 * 크기를 못 읽으면(클라우드·미상 태그) false — 오경보 회피.
 */
export function isSmallLocalModel(scriptEngine: string, model: string, thresholdB = 14): boolean {
  if (scriptEngine !== "ollama") return false;
  const size = parseModelSizeB(model);
  return size !== null && size < thresholdB;
}
