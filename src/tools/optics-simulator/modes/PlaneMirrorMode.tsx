import { useMemo, useState } from "react";
import { SliderField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";

const CANVAS_W = 720;
const CANVAS_H = 320;
const DOMAIN_W = 200; // cm
const DOMAIN_H = 140; // cm
const SCALE = Math.min(CANVAS_W / DOMAIN_W, CANVAS_H / DOMAIN_H);
const ORIGIN_X = CANVAS_W / 2;
const ORIGIN_Y = CANVAS_H / 2;

function toPx(x: number, y: number) {
  return { x: ORIGIN_X + x * SCALE, y: ORIGIN_Y - y * SCALE };
}

export default function PlaneMirrorMode() {
  const [objectDistance, setObjectDistance] = useState(30);
  const [objectHeight, setObjectHeight] = useState(20);
  const [incidencePointHeight, setIncidencePointHeight] = useState(10);

  const imageDistance = -objectDistance; // always virtual, behind mirror
  const imageHeight = objectHeight;
  const imageX = objectDistance; // -di = objectDistance

  const { incidentAngleDeg, reflectedAngleDeg, hitY } = useMemo(() => {
    const hit = { x: 0, y: incidencePointHeight };
    const dirIn = { x: hit.x - -objectDistance, y: hit.y - objectHeight };
    // angle from the normal (horizontal, x-axis)
    const angleIn = (Math.atan2(Math.abs(dirIn.y), Math.abs(dirIn.x)) * 180) / Math.PI;
    return { incidentAngleDeg: angleIn, reflectedAngleDeg: angleIn, hitY: hit.y };
  }, [objectDistance, objectHeight, incidencePointHeight]);

  const objP = toPx(-objectDistance, objectHeight);
  const objBase = toPx(-objectDistance, 0);
  const hitP = toPx(0, hitY);
  // reflected ray direction mirrors the x-component of the incident direction
  const dirIn = { x: 0 - -objectDistance, y: hitY - objectHeight };
  const dirOut = { x: -dirIn.x, y: dirIn.y };
  const reflectedTip = toPx(0 + dirOut.x * 0.8, hitY + dirOut.y * 0.8);
  const imgP = toPx(imageX, imageHeight);
  const imgBase = toPx(imageX, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SliderField label="Object distance (dₒ)" unit=" cm" min={5} max={100} step={1} value={objectDistance} onChange={setObjectDistance} />
        <SliderField label="Object height (hₒ)" unit=" cm" min={1} max={50} step={1} value={objectHeight} onChange={setObjectHeight} />
        <SliderField
          label="Point of incidence height"
          unit=" cm"
          min={0}
          max={Math.max(objectHeight, 5)}
          step={1}
          value={Math.min(incidencePointHeight, Math.max(objectHeight, 5))}
          onChange={setIncidencePointHeight}
        />
        <EquationBox lines={[`dᵢ = −dₒ = ${imageDistance} cm (virtual)`, `hᵢ = hₒ = ${imageHeight} cm`, `M = 1 (same size, upright)`]} />
        <MisconceptionTip
          wrong="Virtual images cannot be seen."
          right="Virtual images CAN be seen (like your reflection) — they just can't be projected on a screen."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width="100%" height="auto" role="img" aria-label="Plane mirror ray diagram">
            <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#0D1412" />
            {/* mirror surface */}
            <line x1={ORIGIN_X} y1={20} x2={ORIGIN_X} y2={CANVAS_H - 20} stroke="#8FA39D" strokeWidth={4} />
            {/* principal axis */}
            <line x1={0} x2={CANVAS_W} y1={ORIGIN_Y} y2={ORIGIN_Y} stroke="#3A4B48" strokeWidth={1} strokeDasharray="5 4" />
            {/* normal at hit point */}
            <line x1={hitP.x - 60} y1={hitP.y} x2={hitP.x + 60} y2={hitP.y} stroke="#5C726C" strokeWidth={1} strokeDasharray="2 3" />
            <text x={hitP.x + 62} y={hitP.y + 3} fontSize="9" fill="#5C726C">
              normal
            </text>

            {/* incident ray */}
            <line x1={objP.x} y1={objP.y} x2={hitP.x} y2={hitP.y} stroke="#E85A4A" strokeWidth={2} />
            {/* reflected ray */}
            <line x1={hitP.x} y1={hitP.y} x2={reflectedTip.x} y2={reflectedTip.y} stroke="#5FC7B8" strokeWidth={2} />
            {/* virtual extension behind mirror */}
            <line x1={hitP.x} y1={hitP.y} x2={imgP.x} y2={imgP.y} stroke="#5FC7B8" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.7} />

            {/* object arrow */}
            <line x1={objBase.x} y1={objBase.y} x2={objP.x} y2={objP.y} stroke="#E85A4A" strokeWidth={2.5} />
            <polygon
              points={`${objP.x},${objP.y} ${objP.x - 5},${objP.y + 9} ${objP.x + 5},${objP.y + 9}`}
              fill="#E85A4A"
            />
            <text x={objP.x - 10} y={objP.y - 8} fontSize="10" fill="#E85A4A">
              Object
            </text>

            {/* virtual image arrow (dashed) */}
            <line x1={imgBase.x} y1={imgBase.y} x2={imgP.x} y2={imgP.y} stroke="#4A90E2" strokeWidth={2.5} strokeDasharray="5 4" opacity={0.8} />
            <polygon points={`${imgP.x},${imgP.y} ${imgP.x - 5},${imgP.y + 9} ${imgP.x + 5},${imgP.y + 9}`} fill="#4A90E2" opacity={0.8} />
            <text x={imgP.x + 6} y={imgP.y - 8} fontSize="10" fill="#4A90E2">
              Virtual image
            </text>

            <circle cx={hitP.x} cy={hitP.y} r={2.5} fill="#ECF2F0" />
          </svg>
        </div>

        <StatGrid
          stats={[
            { label: "Angle of incidence", value: `${incidentAngleDeg.toFixed(1)}°` },
            { label: "Angle of reflection", value: `${reflectedAngleDeg.toFixed(1)}°` },
            { label: "Object dist. (dₒ)", value: `${objectDistance} cm` },
            { label: "Image dist. (dᵢ)", value: `${imageDistance} cm` },
            { label: "Image type", value: "Virtual" },
            { label: "Orientation", value: "Upright" },
          ]}
        />
      </div>
    </div>
  );
}
