interface Point {
  x: number;
  y: number;
}

interface ChartProps {
  series: { points: Point[]; color: string; label?: string; dashed?: boolean }[];
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  markerX?: { x: number; color: string }[];
}

const W = 480;
const H = 220;
const PAD_L = 48;
const PAD_B = 24;
const PAD_T = 10;
const PAD_R = 12;

export default function Chart({ series, xLabel, yLabel, xMin, xMax, yMin, yMax, markerX }: ChartProps) {
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const safeXRange = Math.max(xMax - xMin, 1e-9);
  const safeYRange = Math.max(yMax - yMin, 1e-9);

  const x = (v: number) => PAD_L + ((v - xMin) / safeXRange) * plotW;
  const y = (v: number) => PAD_T + (1 - (v - yMin) / safeYRange) * plotH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label={`${yLabel} vs ${xLabel}`}>
      {/* zero lines */}
      {yMin < 0 && yMax > 0 && <line x1={PAD_L} x2={W - PAD_R} y1={y(0)} y2={y(0)} stroke="#2A3A37" strokeWidth={1} />}
      {xMin < 0 && xMax > 0 && <line x1={x(0)} x2={x(0)} y1={PAD_T} y2={H - PAD_B} stroke="#2A3A37" strokeWidth={1} />}
      <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={H - PAD_B} stroke="#1E2B29" strokeWidth={1} />
      <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="#1E2B29" strokeWidth={1} />

      {markerX?.map((m, i) => (
        <line key={i} x1={x(m.x)} x2={x(m.x)} y1={PAD_T} y2={H - PAD_B} stroke={m.color} strokeWidth={1} strokeDasharray="3 3" />
      ))}

      {series.map((s, i) => {
        const d = s.points.length
          ? s.points.map((p, j) => `${j === 0 ? "M" : "L"} ${x(p.x).toFixed(2)} ${y(p.y).toFixed(2)}`).join(" ")
          : "";
        return d ? (
          <path key={i} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} />
        ) : null;
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
