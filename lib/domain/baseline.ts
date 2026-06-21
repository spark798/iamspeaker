/**
 * 발표 품질 기준선 (B-001). "좋은 발표"의 메트릭 분포를 장르별로 정의한다.
 * ⚠️ 라이선스: 메트릭 *숫자/방법론*만 보관(원문 0). 출처는 baseline JSON의 source에 명기.
 * 사용자 메트릭을 절대값이 아니라 기준선 대비 점수(0~100)로 환산하는 데 쓰인다.
 */

export type Genre = "talk" | "pitch" | "lecture";

/** 적정 구간형(WPM, pause/분): 구간 안=만점, 벗어날수록 감점. */
export interface RangeSpec {
  kind: "range";
  idealMin: number;
  idealMax: number;
  /** 비원어민(L1 ≠ 발표 언어) 보정 구간. 없으면 ideal 사용. */
  nonNativeIdealMin?: number;
  nonNativeIdealMax?: number;
  /** 구간 밖으로 이만큼 벗어나면 0점(선형 감점 폭). */
  tolerance: number;
}

/** 낮을수록 좋음형(filler/분): ideal 이하=만점, hard 이상=0. */
export interface LowerBetterSpec {
  kind: "lowerBetter";
  ideal: number;
  hard: number;
}

/** 상한형(슬라이드 단어 수): limit 이하=만점, hard 이상=0. */
export interface UpperLimitSpec {
  kind: "upperLimit";
  limit: number;
  hard: number;
}

export type MetricSpec = RangeSpec | LowerBetterSpec | UpperLimitSpec;

/** 장르별 기준선. metrics는 일부만 채워질 수 있다(측정 가능한 것만 점수화). */
export interface Baseline {
  genre: Genre;
  /** 출처·라이선스·산출일·표본 메모(원문 0 원칙). */
  source: string;
  metrics: {
    wpm?: RangeSpec;
    fillerPerMin?: LowerBetterSpec;
    pausePerMin?: RangeSpec;
    slideWordsPerSlide?: UpperLimitSpec;
  };
}

/** 점수 평가 밴드: 적정 / 미달(낮음) / 초과(높음). */
export type ScoreBand = "ideal" | "low" | "high";

/** 메트릭 1건의 기준선 대비 점수. */
export interface MetricScore {
  metric: string;
  value: number;
  /** 0~100, 100=기준선 적정 구간 부합. */
  score: number;
  band: ScoreBand;
}
