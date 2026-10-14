import { useMemo } from "react";

interface BeakerProps {
  /** 0..1 how full the cylinder is */
  fillRatio: number;
  /** 0..1 how saturated the liquid color is (concentration relative to a reference max) */
  intensity: number;
  /** base hue for the liquid, e.g. "95, 170, 155" as an "r, g, b" triple */
  colorRgb: string;
  label: string;
  volumeLabel: string;
  concLabel: string;
  ticks?: number;
}

export default function Beaker({
  fillRatio,
  intensity,
  colorRgb,
  label,
  volumeLabel,
  concLabel,
  ticks = 5,
}: BeakerProps) {
  const clampedFill = Math.max(0, Math.min(1, fillRatio));
  const clampedIntensity = Math.max(0.06, Math.min(1, intensity));

  const liquidTop = useMemo(() => 190 - clampedFill * 160, [clampedFill]);
  const liquidHeight = 190 - liquidTop;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 140 220" width="132" height="207" className="overflow-visible">
        {/* glass cylinder outline */}
        <rect x="30" y="20" width="80" height="170" rx="4" fill="none" stroke="#3A4B48" strokeWidth="2" />
        {/* graduation ticks */}
        {Array.from({ length: ticks }).map((_, i) => {
          const y = 30 + (i * 150) / (ticks - 1);
          return (
            <line key={i} x1="30" y1={y} x2="40" y2={y} stroke="#3A4B48" strokeWidth="1.5" />
          );
        })}
        {/* liquid */}
        <clipPath id="beaker-clip">
          <rect x="32" y="21" width="76" height="168" rx="3" />
        </clipPath>
        <g clipPath="url(#beaker-clip)">
          <rect
            x="32"
            y={liquidTop}
            width="76"
            height={liquidHeight}
            fill={`rgba(${colorRgb}, ${clampedIntensity})`}
            style={{ transition: "y 400ms ease, height 400ms ease, fill-opacity 400ms ease" }}
          />
          <rect
            x="32"
            y={liquidTop}
            width="76"
            height="4"
            fill={`rgba(${colorRgb}, ${Math.min(1, clampedIntensity + 0.25)})`}
            style={{ transition: "y 400ms ease" }}
          />
        </g>
        {/* base */}
        <rect x="26" y="188" width="88" height="6" rx="2" fill="#3A4B48" />
      </svg>
      <div className="text-center">
        <div className="text-xs uppercase tracking-wide text-[#8FA39D]">{label}</div>
        <div className="font-mono text-sm text-[#ECF2F0]">{volumeLabel}</div>
        <div className="font-mono text-xs text-[#8FA39D]">{concLabel}</div>
      </div>
    </div>
  );
}
