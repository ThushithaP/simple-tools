interface Point {
  x: number;
  y: number;
}

interface WaveChartProps {
  points: Point[];
  xLabel: string;
  yLabel: string;
  xMax: number;
  yMax: number;
  markers?: { x: number; color: string; label?: string }[];
}

const W = 460;
const H = 180;
const PAD_L = 40;
const PAD_B = 22;
const PAD_T = 10;
const PAD_R = 10;

export default function WaveChart({ points, xLabel, yLabel, xMax, yMax, markers }: WaveChartProps) {
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const safeXMax = Math.max(xMax, 1e-6);
  const safeYMax = Math.max(yMax, 1e-6);

  const x = (v: number) => PAD_L + (v / safeXMax) * plotW;
  const y = (v: number) => PAD_T + plotH / 2 - (v / safeYMax) * (plotH / 2);

  const path = points.length
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.x).toFixed(2)} ${y(p.y).toFixed(2)}`).join(" ")
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label={`${yLabel} vs ${xLabel}`}>
      {/* equilibrium line */}
      <line x1={PAD_L} x2={W - PAD_R} y1={y(0)} y2={y(0)} stroke="#3A4B48" strokeWidth="1" strokeDasharray="4 3" />
      <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={H - PAD_B} stroke="#1E2B29" strokeWidth="1" />
      {markers?.map((m, i) => (
        <line key={i} x1={x(m.x)} x2={x(m.x)} y1={PAD_T} y2={H - PAD_B} stroke={m.color} strokeWidth="1.2" strokeDasharray="3 3" />
      ))}
      {path && <path d={path} fill="none" stroke="#5FC7B8" strokeWidth="2" />}
      <text x={4} y={12} fontSize="9" fill="#5C726C">
        {yLabel}
      </text>
      <text x={W - PAD_R} y={H - 4} textAnchor="end" fontSize="9" fill="#5C726C">
        {xLabel}
      </text>
    </svg>
  );
}
