import { useEffect, useState } from "react";
import { SurfaceFinish } from "../types";
import { EMISSIVITY, netRadiation, radiatedPower, toKelvin } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import { tempToColor } from "../components/tempColor";

export default function RadiationMode() {
  const [objectTempC, setObjectTempC] = useState(500);
  const [surrTempC, setSurrTempC] = useState(25);
  const [emissivity, setEmissivity] = useState(0.9);
  const [surfaceFinish, setSurfaceFinish] = useState<SurfaceFinish>("black");
  const [areaM2, setAreaM2] = useState(1);
  const [distanceM, setDistanceM] = useState(1);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let raf: number;
    function frame() {
      setTime((t) => t + 0.016);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  function pickFinish(finish: SurfaceFinish) {
    setSurfaceFinish(finish);
    setEmissivity(EMISSIVITY[finish]);
  }

  const objectTempK = toKelvin(objectTempC);
  const surrTempK = toKelvin(surrTempC);
  const powerRadiated = radiatedPower(emissivity, areaM2, objectTempK);
  const powerAbsorbed = radiatedPower(emissivity, areaM2, surrTempK);
  const netPower = netRadiation(emissivity, areaM2, objectTempK, surrTempK);

  // doubling check for the "P proportional to T^4" teaching point
  const doubledPower = radiatedPower(emissivity, areaM2, objectTempK * 2);
  const ratio = doubledPower / Math.max(powerRadiated, 1e-9);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SliderField label="Object temperature" unit=" °C" min={20} max={1000} step={5} value={objectTempC} onChange={setObjectTempC} />
        <SliderField label="Surroundings temperature" unit=" °C" min={-50} max={100} step={1} value={surrTempC} onChange={setSurrTempC} />
        <SliderField label="Emissivity (ε)" unit="" min={0} max={1} step={0.01} value={emissivity} onChange={setEmissivity} />
        <SegmentedField
          label="Surface finish (quick-set ε)"
          value={surfaceFinish}
          onChange={pickFinish}
          options={[
            { value: "black", label: "Black" },
            { value: "white", label: "White" },
            { value: "shiny-metal", label: "Shiny" },
            { value: "red", label: "Red" },
            { value: "blue", label: "Blue" },
          ]}
        />
        <SliderField label="Surface area" unit=" m²" min={0.01} max={10} step={0.01} value={areaM2} onChange={setAreaM2} />
        <SliderField label="Distance to detector" unit=" m" min={0.1} max={5.0} step={0.1} value={distanceM} onChange={setDistanceM} />

        <EquationBox
          lines={[
            `P = εσAT⁴ = ${powerRadiated.toFixed(1)} W`,
            `P_net = εσA(T_obj⁴−T_surr⁴) = ${netPower.toFixed(1)} W`,
            `Double T → ${ratio.toFixed(1)}× radiation (should be 16×)`,
          ]}
        />
        <MisconceptionTip wrong="Radiation only happens at very high temperatures." right="Every object above absolute zero radiates thermal energy — you're radiating heat right now." />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <RadiationVisual objectTempC={objectTempC} surrTempC={surrTempC} emissivity={emissivity} time={time} netPower={netPower} distanceM={distanceM} />
        </div>

        <StatGrid
          stats={[
            { label: "T_object", value: `${objectTempK.toFixed(0)} K (${objectTempC}°C)` },
            { label: "T_surroundings", value: `${surrTempK.toFixed(0)} K (${surrTempC}°C)` },
            { label: "Emissivity (ε)", value: emissivity.toFixed(2) },
            { label: "Power radiated", value: `${powerRadiated.toFixed(1)} W` },
            { label: "Power absorbed", value: `${powerAbsorbed.toFixed(1)} W` },
            { label: "Net heat loss", value: `${netPower.toFixed(1)} W` },
          ]}
        />
      </div>
    </div>
  );
}

function RadiationVisual({
  objectTempC,
  surrTempC,
  emissivity,
  time,
  netPower,
  distanceM,
}: {
  objectTempC: number;
  surrTempC: number;
  emissivity: number;
  time: number;
  netPower: number;
  distanceM: number;
}) {
  const W = 720;
  const H = 280;
  const cx = 200;
  const cy = H / 2;
  const objColor = tempToColor(objectTempC, 0, 1000);
  const intensity = Math.max(0.15, Math.min(1, (objectTempC + 50) / 600)) * emissivity;
  const nRays = Math.max(4, Math.round(intensity * 16));
  const detectorX = Math.min(W - 60, cx + 120 + distanceM * 60);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Thermal radiation from a hot object">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      {/* radiating waves */}
      {Array.from({ length: nRays }).map((_, i) => {
        const angle = (i / nRays) * Math.PI * 2;
        const phase = (time * 1.5 + i * 0.3) % 1;
        const r = 40 + phase * 90;
        const opacity = emissivity * (1 - phase) * 0.8;
        return <circle key={i} cx={cx + Math.cos(angle) * r} cy={cy + Math.sin(angle) * r} r={2.5} fill="#E8A33D" opacity={Math.max(0, opacity)} />;
      })}
      <circle cx={cx} cy={cy} r={36} fill={objColor} stroke="#ECF2F0" strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 ${intensity * 14}px ${objColor})` }} />
      <text x={cx - 30} y={cy + 55} fontSize="10" fill={objColor}>
        {objectTempC}°C object
      </text>

      {/* detector */}
      <rect x={detectorX} y={cy - 20} width={16} height={40} fill="#0F1614" stroke="#4A90E2" strokeWidth={1.5} />
      <text x={detectorX - 10} y={cy + 55} fontSize="9" fill="#4A90E2">
        detector
      </text>

      {/* net flow arrow */}
      <line
        x1={cx + 40}
        y1={cy}
        x2={detectorX - 4}
        y2={cy}
        stroke={netPower > 0 ? "#E85A4A" : "#4A90E2"}
        strokeWidth={2}
        markerEnd="url(#radArrow)"
        opacity={0.6}
      />
      <defs>
        <marker id="radArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={netPower > 0 ? "#E85A4A" : "#4A90E2"} />
        </marker>
      </defs>

      <text x={20} y={30} fontSize="10" fill="#8FA39D">
        Surroundings: {surrTempC}°C
      </text>
      <text x={20} y={H - 16} fontSize="10" fill="#8FA39D">
        {netPower > 0 ? "Net heat flows outward (object hotter)" : "Net heat flows inward (object cooler)"}
      </text>
    </svg>
  );
}
