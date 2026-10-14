import { TitrationPoint } from "../chemistry";

interface PHChartProps {
  points: TitrationPoint[];
  maxVolumeMl: number;
  equivalenceVolumeMl?: number;
  currentVolumeMl?: number;
}

const W = 480;
const H = 240;
const PAD_L = 40;
const PAD_B = 28;
const PAD_T = 12;
const PAD_R = 12;

export default function PHChart({ points, maxVolumeMl, equivalenceVolumeMl, currentVolumeMl }: PHChartProps) {
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const safeMaxVol = Math.max(maxVolumeMl, 1);

  const x = (v: number) => PAD_L + (v / safeMaxVol) * plotW;
  const y = (ph: number) => PAD_T + (1 - ph / 14) * plotH;

  const path = points.length
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.volumeMl).toFixed(2)} ${y(p.pH).toFixed(2)}`).join(" ")
    : "";

  const gridPhLines = [0, 2, 4, 6, 7, 8, 10, 12, 14];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="pH versus volume added">
      {/* graph paper grid */}
      {gridPhLines.map((ph) => (
        <g key={ph}>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y(ph)}
            y2={y(ph)}
            stroke={ph === 7 ? "#3A4B48" : "#1E2B29"}
            strokeWidth={ph === 7 ? 1.2 : 1}
            strokeDasharray={ph === 7 ? "4 3" : undefined}
          />
          <text x={PAD_L - 8} y={y(ph) + 3} textAnchor="end" fontSize="9" fill="#8FA39D" fontFamily="monospace">
            {ph}
          </text>
        </g>
      ))}
      {/* x axis ticks */}
      {Array.from({ length: 5 }).map((_, i) => {
        const v = (safeMaxVol * i) / 4;
        return (
          <text key={i} x={x(v)} y={H - 8} textAnchor="middle" fontSize="9" fill="#8FA39D" fontFamily="monospace">
            {v.toFixed(1)}
          </text>
        );
      })}
      <text x={W / 2} y={H - 1} textAnchor="middle" fontSize="8" fill="#5C726C">
        Titrant added (mL)
      </text>

      {/* equivalence marker */}
      {equivalenceVolumeMl !== undefined && equivalenceVolumeMl <= safeMaxVol && (
        <line
          x1={x(equivalenceVolumeMl)}
          x2={x(equivalenceVolumeMl)}
          y1={PAD_T}
          y2={H - PAD_B}
          stroke="#E8A33D"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
      )}

      {/* curve */}
      {path && <path d={path} fill="none" stroke="#5FC7B8" strokeWidth="2" />}

      {/* current point */}
      {currentVolumeMl !== undefined && points.length > 0 && (
        <circle
          cx={x(currentVolumeMl)}
          cy={y(points[points.length - 1].pH)}
          r="3.5"
          fill="#ECF2F0"
          stroke="#5FC7B8"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}
