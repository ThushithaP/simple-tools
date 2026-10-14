interface DataPoint {
  t: number;
  value: number;
}

interface QuantityChartProps {
  points: DataPoint[];
  yLabel: string;
  maxY?: number;
}

const W = 460;
const H = 200;
const PAD_L = 46;
const PAD_B = 24;
const PAD_T = 10;
const PAD_R = 10;

export default function QuantityChart({ points, yLabel, maxY }: QuantityChartProps) {
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const maxT = Math.max(1, points.length ? points[points.length - 1].t : 1);
  const computedMaxY = maxY ?? Math.max(0.0001, ...points.map((p) => p.value));

  const x = (t: number) => PAD_L + (t / maxT) * plotW;
  const y = (v: number) => PAD_T + (1 - v / computedMaxY) * plotH;

  const path = points.length
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t).toFixed(2)} ${y(p.value).toFixed(2)}`).join(" ")
    : "";

  const yTicks = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label={`${yLabel} over time`}>
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const v = (computedMaxY * i) / yTicks;
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="#1E2B29" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#8FA39D" fontFamily="monospace">
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}
      {Array.from({ length: 5 }).map((_, i) => {
        const t = (maxT * i) / 4;
        return (
          <text key={i} x={x(t)} y={H - 6} textAnchor="middle" fontSize="9" fill="#8FA39D" fontFamily="monospace">
            {t.toFixed(0)}s
          </text>
        );
      })}
      {path && <path d={path} fill="none" stroke="#5FC7B8" strokeWidth="2" />}
      <text x={8} y={12} fontSize="9" fill="#5C726C">
        {yLabel}
      </text>
    </svg>
  );
}
