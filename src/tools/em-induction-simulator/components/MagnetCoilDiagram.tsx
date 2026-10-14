export type Pole = "N" | "S";

interface MagnetCoilDiagramProps {
  magnetXMeters: number; // position of magnet center, negative = left of coil
  domainMeters: number; // half-width of visible domain
  poleNearCoil: Pole; // which pole leads (faces the coil)
  currentA: number; // signed; sign convention: positive = counterclockwise viewed from magnet side
  dPhiDt: number; // signed rate of flux change, used to derive the coil's induced pole
  showFieldLines: boolean;
  showInducedPoles: boolean;
  showGalvanometer: boolean;
  turnsVisual?: number;
}

const W = 720;
const H = 260;
const COIL_CX = W / 2;
const COIL_HALF_W = 46;
const COIL_HALF_H = 60;

function oppositePole(p: Pole): Pole {
  return p === "N" ? "S" : "N";
}

export default function MagnetCoilDiagram({
  magnetXMeters,
  domainMeters,
  poleNearCoil,
  currentA,
  dPhiDt,
  showFieldLines,
  showInducedPoles,
  showGalvanometer,
  turnsVisual = 6,
}: MagnetCoilDiagramProps) {
  const pxPerM = (W / 2 - 60) / domainMeters;
  const magnetPx = COIL_CX + magnetXMeters * pxPerM;
  const magnetLen = 90;
  const magnetOnLeft = magnetXMeters < 0;
  const nearPoleColor = (p: Pole) => (p === "N" ? "#E85A4A" : "#4A90E2");
  const farPole = oppositePole(poleNearCoil);

  const inducedNearPole: Pole | null = Math.abs(dPhiDt) < 1e-9 ? null : dPhiDt > 0 ? poleNearCoil : oppositePole(poleNearCoil);

  const currentMagnitude = Math.min(1, Math.abs(currentA) * 2000);
  const currentSign = currentA >= 0 ? 1 : -1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Magnet and coil diagram">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />

      {/* field lines from magnet */}
      {showFieldLines && (
        <g opacity={0.55}>
          {[0.4, 0.7, 1.0].map((r, i) => (
            <ellipse
              key={i}
              cx={magnetPx + (magnetOnLeft ? magnetLen / 2 : -magnetLen / 2)}
              cy={H / 2}
              rx={40 * r}
              ry={70 * r}
              fill="none"
              stroke="#4A90E2"
              strokeWidth={1}
            />
          ))}
        </g>
      )}

      {/* coil */}
      <g>
        <rect x={COIL_CX - COIL_HALF_W} y={H / 2 - COIL_HALF_H} width={COIL_HALF_W * 2} height={COIL_HALF_H * 2} fill="none" stroke="#B5652A" strokeWidth={1} />
        {Array.from({ length: turnsVisual }).map((_, i) => {
          const y = H / 2 - COIL_HALF_H + (i / (turnsVisual - 1)) * COIL_HALF_H * 2;
          return <line key={i} x1={COIL_CX - COIL_HALF_W} y1={y} x2={COIL_CX + COIL_HALF_W} y2={y} stroke="#B5652A" strokeWidth={2} />;
        })}
        {/* current direction arc */}
        {currentMagnitude > 0.02 && (
          <path
            d={`M ${COIL_CX - 20} ${H / 2 - COIL_HALF_H - 10} A 20 10 0 1 ${currentSign > 0 ? 1 : 0} ${COIL_CX + 20} ${H / 2 - COIL_HALF_H - 10}`}
            fill="none"
            stroke="#6FCF7A"
            strokeWidth={2}
            markerEnd="url(#coilArrow)"
            opacity={0.4 + currentMagnitude * 0.6}
          />
        )}
        <defs>
          <marker id="coilArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6FCF7A" />
          </marker>
        </defs>

        {showInducedPoles && inducedNearPole && (
          <text
            x={magnetOnLeft ? COIL_CX - COIL_HALF_W - 16 : COIL_CX + COIL_HALF_W + 6}
            y={H / 2 + 5}
            fontSize="13"
            fontWeight="bold"
            fill={nearPoleColor(inducedNearPole)}
          >
            {inducedNearPole}
          </text>
        )}
        <text x={COIL_CX - 20} y={H / 2 - COIL_HALF_H - 30} fontSize="10" fill="#8FA39D">
          Coil
        </text>
      </g>

      {/* magnet */}
      <g>
        <rect
          x={magnetPx - magnetLen / 2}
          y={H / 2 - 16}
          width={magnetLen / 2}
          height={32}
          fill={magnetOnLeft ? nearPoleColor(farPole) : nearPoleColor(poleNearCoil)}
          opacity={0.85}
        />
        <rect
          x={magnetPx}
          y={H / 2 - 16}
          width={magnetLen / 2}
          height={32}
          fill={magnetOnLeft ? nearPoleColor(poleNearCoil) : nearPoleColor(farPole)}
          opacity={0.85}
        />
        <text x={magnetPx - magnetLen / 2 + (magnetOnLeft ? 8 : 30)} y={H / 2 + 5} fontSize="13" fontWeight="bold" fill="#0D1412">
          {magnetOnLeft ? farPole : poleNearCoil}
        </text>
        <text x={magnetPx + (magnetOnLeft ? 30 : 8)} y={H / 2 + 5} fontSize="13" fontWeight="bold" fill="#0D1412">
          {magnetOnLeft ? poleNearCoil : farPole}
        </text>
      </g>

      {showGalvanometer && (
        <g transform={`translate(${W - 120}, 40)`}>
          <circle cx={40} cy={40} r={36} fill="none" stroke="#8FA39D" strokeWidth={1.5} />
          <line
            x1={40}
            y1={40}
            x2={40 + 28 * Math.sin(currentSign * currentMagnitude * 1.1)}
            y2={40 - 28 * Math.cos(currentSign * currentMagnitude * 1.1)}
            stroke="#5FC7B8"
            strokeWidth={2}
          />
          <text x={16} y={90} fontSize="9" fill="#8FA39D">
            Galvanometer
          </text>
        </g>
      )}
    </svg>
  );
}
