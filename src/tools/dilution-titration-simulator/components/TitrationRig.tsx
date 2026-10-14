interface TitrationRigProps {
  /** 0..1 how much titrant remains in the burette */
  buretteRemaining: number;
  /** 0..1 how full the flask is (analyte + titrant added) */
  flaskFill: number;
  /** hex color of the flask liquid, driven by the indicator */
  flaskColor: string;
  isDripping: boolean;
}

export default function TitrationRig({ buretteRemaining, flaskFill, flaskColor, isDripping }: TitrationRigProps) {
  const clampedBurette = Math.max(0, Math.min(1, buretteRemaining));
  const clampedFlask = Math.max(0.12, Math.min(1, flaskFill));

  const buretteLiquidTop = 20 + (1 - clampedBurette) * 120;
  const buretteLiquidHeight = 140 - buretteLiquidTop;

  return (
    <svg viewBox="0 0 220 320" width="200" height="291" className="overflow-visible">
      {/* burette body */}
      <rect x="100" y="10" width="20" height="140" rx="3" fill="none" stroke="#3A4B48" strokeWidth="2" />
      <clipPath id="burette-clip">
        <rect x="101" y="11" width="18" height="138" rx="2" />
      </clipPath>
      <g clipPath="url(#burette-clip)">
        <rect
          x="101"
          y={buretteLiquidTop}
          width="18"
          height={buretteLiquidHeight}
          fill="#5FC7B8"
          fillOpacity="0.75"
          style={{ transition: "y 250ms linear, height 250ms linear" }}
        />
      </g>
      {/* stopcock */}
      <rect x="98" y="150" width="24" height="8" rx="2" fill="#3A4B48" />
      <line x1="110" y1="158" x2="110" y2="172" stroke="#3A4B48" strokeWidth="2" />

      {/* falling drop */}
      {isDripping && (
        <circle cx="110" cy="178" r="2.5" fill="#5FC7B8">
          <animate attributeName="cy" values="172;205" dur="0.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;1;0" dur="0.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* conical flask */}
      <path
        d="M92 210 L92 250 L45 305 Q40 312 48 312 L172 312 Q180 312 175 305 L128 250 L128 210 Z"
        fill="none"
        stroke="#3A4B48"
        strokeWidth="2"
      />
      <clipPath id="flask-clip">
        <path d="M93 211 L93 250 L47 304 Q44 309 49 309 L171 309 Q176 309 173 304 L127 250 L127 211 Z" />
      </clipPath>
      <g clipPath="url(#flask-clip)">
        <rect
          x="40"
          y={312 - clampedFlask * 95}
          width="140"
          height={clampedFlask * 95 + 5}
          fill={flaskColor}
          style={{ transition: "y 400ms ease, fill 400ms ease" }}
        />
      </g>
      {/* flask neck rim */}
      <line x1="92" y1="210" x2="128" y2="210" stroke="#3A4B48" strokeWidth="2" />
    </svg>
  );
}
