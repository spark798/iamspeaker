"use client";

interface TrendChartProps {
  /** 회차순 값(빈/대기 회차는 호출부에서 제외). */
  values: number[];
  /** 적정 구간 [min,max] — 음영으로 표시(선택). */
  band?: [number, number];
  /** 선/점 색(Tailwind 토큰 대신 CSS 색). */
  color?: string;
  label: string;
}

const W = 100;
const H = 36;
const PAD = 3;

/** 의존성 없는 인라인 SVG 라인 차트(회차별 추이). 1개 점도 처리. */
export function TrendChart({
  values,
  band,
  color = "var(--brand, #6366f1)",
  label,
}: TrendChartProps) {
  if (values.length === 0) return null;

  const lo = Math.min(...values, ...(band ? [band[0]] : []));
  const hi = Math.max(...values, ...(band ? [band[1]] : []));
  const span = hi - lo || 1;
  const x = (i: number) =>
    values.length === 1 ? W / 2 : PAD + (i / (values.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (H - 2 * PAD);

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const first = values[0] as number;
  const last = values[values.length - 1] as number;
  const delta = last - first;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-neutral-600 dark:text-neutral-300">{label}</span>
        <span className="text-neutral-500">
          {first} → {last}
          {values.length > 1 && (
            <span className={delta === 0 ? "" : delta > 0 ? " text-amber-600" : " text-green-600"}>
              {" "}
              ({delta > 0 ? "+" : ""}
              {delta})
            </span>
          )}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-16 w-full"
        role="img"
        aria-label={`${label} trend`}
      >
        {band && (
          <rect
            x={0}
            y={y(band[1])}
            width={W}
            height={Math.max(0, y(band[0]) - y(band[1]))}
            fill={color}
            opacity={0.1}
          />
        )}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {values.map((v, i) => (
          <circle
            key={`${i}-${v}`}
            cx={x(i)}
            cy={y(v)}
            r={1.8}
            fill={color}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}
