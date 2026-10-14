interface Point {
  x: number;
  y: number;
}

interface ChartProps {
  series: { points: Point[]; color: string; dashed?: boolean }[];
  xLabel: string;
  yLabel: string;
  xMax: number;
  yMin: number;
  yMax: number;
  markerY?: { y: number; color: string; label?: string }[];
}

const W = 460;
const H = 200;
const PAD_L = 46;
const PAD_B = 22;
const PAD_T = 10;
const PAD_R = 10;

export default function Chart({ series, xLabel, yLabel, xMax, yMin, yMax, markerY }: ChartProps) {
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const safeXMax = Math.max(xMax, 1e-9);
  const safeYRange = Math.max(yMax - yMin, 1e-9);

  const x = (v: number) => PAD_L + (v / safeXMax) * plotW;
  const y = (v: number) => PAD_T + (1 - (v - yMin) / safeYRange) * plotH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label={`${yLabel} vs ${xLabel}`}>
      <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={H - PAD_B} stroke="#1E2B29" strokeWidth={1} />
      <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="#1E2B29" strokeWidth={1} />
      {markerY?.map((m, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(m.y)} y2={y(m.y)} stroke={m.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
          {m.label && (
            <text x={W - PAD_R} y={y(m.y) - 3} textAnchor="end" fontSize="8" fill={m.color}>
              {m.label}
            </text>
          )}
        </g>
      ))}
      {series.map((s, i) => {
        const d = s.points.length ? s.points.map((p, j) => `${j === 0 ? "M" : "L"} ${x(p.x).toFixed(2)} ${y(p.y).toFixed(2)}`).join(" ") : "";
        return d ? <path key={i} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} /> : null;
      })}
      <text x={4} y={12} fontSize="9" fill="#5C726C">
        {yLabel}
      </text>
      <text x={W - PAD_R} y={H - 4} textAnchor="end" fontSize="9" fill="#5C726C">
        {xLabel}
      </text>
    </svg>
  );
}
