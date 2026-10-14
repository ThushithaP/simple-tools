interface Point {
  x: number;
  y: number;
}

interface ChartProps {
  points: Point[];
  xLabel: string;
  yLabel: string;
  xMax: number;
  yMax: number;
  color?: string;
}

const W = 460;
const H = 200;
const PAD_L = 48;
const PAD_B = 22;
const PAD_T = 10;
const PAD_R = 10;

export default function Chart({ points, xLabel, yLabel, xMax, yMax, color = "#5FC7B8" }: ChartProps) {
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const safeXMax = Math.max(xMax, 1e-9);
  const safeYMax = Math.max(yMax, 1e-9);

  const x = (v: number) => PAD_L + (v / safeXMax) * plotW;
  const y = (v: number) => PAD_T + (1 - v / safeYMax) * plotH;

  const d = points.length ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.x).toFixed(2)} ${y(p.y).toFixed(2)}`).join(" ") : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label={`${yLabel} vs ${xLabel}`}>
      <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={H - PAD_B} stroke="#1E2B29" strokeWidth={1} />
      <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="#1E2B29" strokeWidth={1} />
      {d && <path d={d} fill="none" stroke={color} strokeWidth={2} />}
      <text x={4} y={12} fontSize="9" fill="#5C726C">
        {yLabel}
      </text>
      <text x={W - PAD_R} y={H - 4} textAnchor="end" fontSize="9" fill="#5C726C">
        {xLabel}
      </text>
    </svg>
  );
}
