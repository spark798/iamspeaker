/**
 * 리포트 시각화용 경량 SVG 차트(의존성 0). 다크모드·인쇄(print) 안전.
 * stroke/fill은 currentColor + tailwind text-* 클래스로 테마링.
 */

/** 0~max 점수를 원형 링으로. 가운데 큰 숫자. */
export function RingGauge({
  value,
  max = 100,
  colorClass,
  centerText,
  ariaLabel,
}: {
  value: number;
  max?: number;
  colorClass: string;
  centerText?: string;
  ariaLabel: string;
}) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0" role="img" aria-label={ariaLabel}>
      <circle
        cx="40"
        cy="40"
        r={r}
        strokeWidth="8"
        className="fill-none stroke-neutral-200 dark:stroke-neutral-800"
      />
      <circle
        cx="40"
        cy="40"
        r={r}
        strokeWidth="8"
        strokeLinecap="round"
        stroke="currentColor"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform="rotate(-90 40 40)"
        className={`fill-none ${colorClass}`}
      />
      <text
        x="40"
        y="40"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-neutral-900 text-lg font-bold dark:fill-neutral-100"
      >
        {centerText ?? value}
      </text>
    </svg>
  );
}

/**
 * 가로 범위 게이지 — 목표 구간(zone)을 초록 띠로, 실제 값을 마커로 표시.
 * "내 값이 목표 대비 어디인가"를 한눈에(예: WPM).
 */
export function RangeGauge({
  value,
  axisMin,
  axisMax,
  zoneMin,
  zoneMax,
  inZone,
  ariaLabel,
}: {
  value: number;
  axisMin: number;
  axisMax: number;
  zoneMin: number;
  zoneMax: number;
  inZone: boolean;
  ariaLabel: string;
}) {
  const span = Math.max(1, axisMax - axisMin);
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - axisMin) / span) * 100))}%`;
  return (
    <div
      className="relative h-3 w-full rounded-full bg-neutral-200 dark:bg-neutral-800"
      role="img"
      aria-label={ariaLabel}
    >
      <div
        className="absolute inset-y-0 rounded-full bg-green-500/30"
        style={{ left: pct(zoneMin), right: `calc(100% - ${pct(zoneMax)})` }}
      />
      <div
        className={`absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
          inZone ? "bg-green-600" : "bg-amber-500"
        }`}
        style={{ left: pct(value) }}
      />
    </div>
  );
}
