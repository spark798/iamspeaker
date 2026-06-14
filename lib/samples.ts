/** 개발/시드/Walking-Skeleton 공용 샘플 슬라이드(피치 예시). */
export interface SampleSlide {
  textContent: string;
  notes?: string;
}

export const SAMPLE_SLIDES: SampleSlide[] = [
  { textContent: "Problem: 고객 이탈률이 높습니다." },
  { textContent: "Solution: 예측 ML로 이탈을 30% 줄입니다." },
  { textContent: "Traction: MRR $40K, 월 15% 성장." },
];
