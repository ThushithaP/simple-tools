import { useMemo, useState } from "react";
import { OpticalMedium } from "../types";
import { REFRACTIVE_INDEX, snellsLaw } from "../optics";
import { SliderField, SelectField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";

const CANVAS_W = 720;
const CANVAS_H = 340;
const ORIGIN_X = CANVAS_W / 2;
const ORIGIN_Y = CANVAS_H / 2;
const RAY_LEN = 150;

const MEDIUM_TINT: Record<OpticalMedium, string> = {
  air: "#0D1412",
  water: "#1a3a4a22",
  glass: "#2a3a4a22",
  diamond: "#3a3a5a33",
};

const MEDIUM_LABEL: Record<OpticalMedium, string> = {
  air: "Air (n=1.00)",
  water: "Water (n=1.33)",
  glass: "Glass (n=1.50)",
  diamond: "Diamond (n=2.42)",
};

export default function RefractionMode() {
  const [medium1, setMedium1] = useState<OpticalMedium>("air");
  const [medium2, setMedium2] = useState<OpticalMedium>("water");
  const [incidentAngleDeg, setIncidentAngleDeg] = useState(45);

  const n1 = REFRACTIVE_INDEX[medium1];
  const n2 = REFRACTIVE_INDEX[medium2];
  const result = useMemo(() => snellsLaw(n1, n2, incidentAngleDeg), [n1, n2, incidentAngleDeg]);
  const deviation = result.refractedAngleDeg !== null ? incidentAngleDeg - result.refractedAngleDeg : null;

  const theta1Rad = (incidentAngleDeg * Math.PI) / 180;
  const incidentStart = { x: ORIGIN_X - Math.sin(theta1Rad) * RAY_LEN, y: ORIGIN_Y - Math.cos(theta1Rad) * RAY_LEN };
  const reflectedEnd = { x: ORIGIN_X + Math.sin(theta1Rad) * RAY_LEN, y: ORIGIN_Y - Math.cos(theta1Rad) * RAY_LEN };
  const theta2Rad = result.refractedAngleDeg !== null ? (result.refractedAngleDeg * Math.PI) / 180 : 0;
  const refractedEnd = { x: ORIGIN_X + Math.sin(theta2Rad) * RAY_LEN, y: ORIGIN_Y + Math.cos(theta2Rad) * RAY_LEN };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SelectField
          label="Medium 1 (top)"
          value={medium1}
          onChange={setMedium1}
          options={(Object.keys(REFRACTIVE_INDEX) as OpticalMedium[]).map((m) => ({ value: m, label: MEDIUM_LABEL[m] }))}
        />
        <SelectField
          label="Medium 2 (bottom)"
          value={medium2}
          onChange={setMedium2}
          options={(Object.keys(REFRACTIVE_INDEX) as OpticalMedium[]).map((m) => ({ value: m, label: MEDIUM_LABEL[m] }))}
        />
        <SliderField label="Incident angle (θ₁)" unit="°" min={0} max={89} step={1} value={incidentAngleDeg} onChange={setIncidentAngleDeg} />

        <EquationBox
          lines={[
            `n₁sin(θ₁) = n₂sin(θ₂)`,
            `${n1.toFixed(2)} × sin(${incidentAngleDeg}°) = ${n2.toFixed(2)} × sin(θ₂)`,
            result.totalInternalReflection
              ? `→ Total internal reflection (θ₁ > θc)`
              : `→ θ₂ = ${result.refractedAngleDeg!.toFixed(1)}°`,
          ]}
        />
        <MisconceptionTip
          wrong="Total internal reflection happens going from air to water."
          right="TIR only happens going from a denser to a rarer medium (e.g. water to air) AND when θ₁ exceeds the critical angle."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width="100%" height="auto" role="img" aria-label="Refraction ray diagram">
            <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#0D1412" />
            <rect x={0} y={0} width={CANVAS_W} height={ORIGIN_Y} fill={MEDIUM_TINT[medium1]} />
            <rect x={0} y={ORIGIN_Y} width={CANVAS_W} height={CANVAS_H - ORIGIN_Y} fill={MEDIUM_TINT[medium2]} />
            {/* boundary */}
            <line x1={0} y1={ORIGIN_Y} x2={CANVAS_W} y2={ORIGIN_Y} stroke="#3A4B48" strokeWidth={1.5} />
            {/* normal */}
            <line x1={ORIGIN_X} y1={ORIGIN_Y - 140} x2={ORIGIN_X} y2={ORIGIN_Y + 140} stroke="#5C726C" strokeWidth={1} strokeDasharray="2 3" />
            <text x={ORIGIN_X + 4} y={ORIGIN_Y - 130} fontSize="9" fill="#5C726C">
              normal
            </text>

            {/* medium labels */}
            <text x={12} y={20} fontSize="11" fill="#8FA39D">
              {MEDIUM_LABEL[medium1]}
            </text>
            <text x={12} y={CANVAS_H - 10} fontSize="11" fill="#8FA39D">
              {MEDIUM_LABEL[medium2]}
            </text>

            {/* incident ray */}
            <line x1={incidentStart.x} y1={incidentStart.y} x2={ORIGIN_X} y2={ORIGIN_Y} stroke="#E85A4A" strokeWidth={2.2} />
            <text x={incidentStart.x - 10} y={incidentStart.y} fontSize="9" fill="#E85A4A">
              incident
            </text>

            {/* reflected ray (always shown, faint unless TIR) */}
            <line
              x1={ORIGIN_X}
              y1={ORIGIN_Y}
              x2={reflectedEnd.x}
              y2={reflectedEnd.y}
              stroke="#5FC7B8"
              strokeWidth={result.totalInternalReflection ? 2.2 : 1.2}
              opacity={result.totalInternalReflection ? 1 : 0.45}
            />

            {/* refracted ray */}
            {!result.totalInternalReflection && (
              <>
                <line x1={ORIGIN_X} y1={ORIGIN_Y} x2={refractedEnd.x} y2={refractedEnd.y} stroke="#4A90E2" strokeWidth={2.2} />
                <text x={refractedEnd.x + 6} y={refractedEnd.y} fontSize="9" fill="#4A90E2">
                  refracted
                </text>
              </>
            )}

            {result.totalInternalReflection && (
              <text x={ORIGIN_X + 10} y={ORIGIN_Y + 30} fontSize="11" fill="#E8A33D">
                Total internal reflection
              </text>
            )}

            <circle cx={ORIGIN_X} cy={ORIGIN_Y} r={2.5} fill="#ECF2F0" />
          </svg>
        </div>

        <StatGrid
          stats={[
            { label: "θ₁ (incident)", value: `${incidentAngleDeg}°` },
            { label: "θ₂ (refracted)", value: result.refractedAngleDeg !== null ? `${result.refractedAngleDeg.toFixed(1)}°` : "—" },
            { label: "n₁", value: n1.toFixed(2) },
            { label: "n₂", value: n2.toFixed(2) },
            { label: "Critical angle (θc)", value: result.criticalAngleDeg !== null ? `${result.criticalAngleDeg.toFixed(1)}°` : "n/a (n₁ ≤ n₂)" },
            { label: "Deviation", value: deviation !== null ? `${deviation.toFixed(1)}°` : "—" },
            { label: "TIR?", value: result.totalInternalReflection ? "Yes" : "No", muted: !result.totalInternalReflection },
          ]}
        />
      </div>
    </div>
  );
}
