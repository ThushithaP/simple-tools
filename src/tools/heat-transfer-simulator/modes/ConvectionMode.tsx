import { useEffect, useRef, useState } from "react";
import { ConvectionFluid, ConvectionType } from "../types";
import { convectionCoefficient, convectionHeatRate } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip, PlaybackControls } from "../components/Controls";
import { tempToColor } from "../components/tempColor";
import FullscreenPanel from "../../../components/FullscreenPanel";

const AMBIENT_C = 20;
const FLUID_THERMAL_MASS = 800; // nominal m*c for the modeled fluid volume, tuned for a watchable approach

interface FlowParticle {
  angle: number;
  radius: number;
  speedMul: number;
}

function makeParticles(n: number): FlowParticle[] {
  return Array.from({ length: n }).map(() => ({ angle: Math.random() * Math.PI * 2, radius: 30 + Math.random() * 70, speedMul: 0.7 + Math.random() * 0.6 }));
}
const PARTICLES = makeParticles(40);

export default function ConvectionMode() {
  const [fluid, setFluid] = useState<ConvectionFluid>("air");
  const [sourcePower, setSourcePower] = useState(200);
  const [convType, setConvType] = useState<ConvectionType>("natural");
  const [fanSpeedPct, setFanSpeedPct] = useState(50);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);

  const tempRef = useRef(AMBIENT_C);
  const timeRef = useRef(0);
  const [, forceRender] = useState(0);

  const h = convectionCoefficient(fluid, convType, fanSpeedPct / 100);
  const areaM2 = 0.3; // nominal heat-exchange surface for this demo container

  function reset() {
    tempRef.current = AMBIENT_C;
    timeRef.current = 0;
    setRunning(true);
  }

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fluid, sourcePower, convType, fanSpeedPct]);

  useEffect(() => {
    let raf: number;
    let lastTs: number | null = null;
    function frame(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000) * speed;
      lastTs = ts;
      if (running) {
        timeRef.current += dt;
        const lossRate = convectionHeatRate(h, areaM2, tempRef.current - AMBIENT_C);
        const netRate = sourcePower - lossRate;
        tempRef.current += (netRate / FLUID_THERMAL_MASS) * dt;
      }
      forceRender((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, h, sourcePower]);

  const steadyStateTemp = AMBIENT_C + sourcePower / (h * areaM2);
  const currentLossRate = convectionHeatRate(h, areaM2, tempRef.current - AMBIENT_C);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Fluid"
          value={fluid}
          onChange={setFluid}
          options={[
            { value: "air", label: "Air" },
            { value: "water", label: "Water" },
            { value: "oil", label: "Oil" },
          ]}
        />
        <SliderField label="Heat source power" unit=" W" min={10} max={1000} step={10} value={sourcePower} onChange={setSourcePower} />
        <SegmentedField
          label="Convection type"
          value={convType}
          onChange={setConvType}
          options={[
            { value: "natural", label: "Natural" },
            { value: "forced", label: "Forced" },
          ]}
        />
        {convType === "forced" && <SliderField label="Fan speed" unit="%" min={0} max={100} step={5} value={fanSpeedPct} onChange={setFanSpeedPct} />}
        <PlaybackControls running={running} onToggleRunning={() => setRunning((r) => !r)} onReset={reset} speed={speed} onSpeedChange={setSpeed} />

        <EquationBox lines={[`Q/t = hAΔT`, `h = ${h.toFixed(0)} W/m²·K`, `Steady-state T ≈ ${steadyStateTemp.toFixed(1)} °C`]} />
        <MisconceptionTip wrong="Convection happens in solids too." right="Convection requires fluid flow — only liquids and gases. Solids only conduct." />
      </div>

      <div className="space-y-6">
        <FullscreenPanel>
          <ConvectionVisual temp={tempRef.current} time={timeRef.current} convType={convType} fanSpeedPct={fanSpeedPct} />
        </FullscreenPanel>

        <StatGrid
          stats={[
            { label: "Fluid temperature", value: `${tempRef.current.toFixed(1)} °C` },
            { label: "ΔT (fluid − ambient)", value: `${(tempRef.current - AMBIENT_C).toFixed(1)} °C` },
            { label: "h coefficient", value: `${h.toFixed(0)} W/m²·K` },
            { label: "Heat loss rate now", value: `${currentLossRate.toFixed(0)} W` },
            { label: "Steady-state temp.", value: `${steadyStateTemp.toFixed(1)} °C` },
            { label: "Flow type", value: convType === "forced" ? `Forced (fan ${fanSpeedPct}%)` : "Natural (buoyancy)" },
          ]}
        />
      </div>
    </div>
  );
}

function ConvectionVisual({ temp, time, convType, fanSpeedPct }: { temp: number; time: number; convType: ConvectionType; fanSpeedPct: number }) {
  const W = 720;
  const H = 280;
  const cx = W / 2;
  const cy = H / 2 + 10;
  const color = tempToColor(temp, 15, 120);
  const speedMul = convType === "forced" ? 1 + fanSpeedPct / 40 : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Convection currents in a fluid container">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      <rect x={cx - 150} y={40} width={300} height={200} fill={`${color}18`} stroke="#3A4B48" strokeWidth={2} />

      {/* heat source at bottom */}
      <rect x={cx - 40} y={224} width={80} height={12} fill="#E85A4A" opacity={0.8} />
      <text x={cx - 34} y={252} fontSize="9" fill="#E8A33D">
        heat source
      </text>

      {convType === "natural" ? (
        PARTICLES.map((p, i) => {
          const t = time * speedMul * p.speedMul;
          const a = p.angle + t * 0.6;
          const wobble = Math.sin(t * 2 + i) * 8;
          const px = cx + Math.cos(a) * (p.radius + wobble);
          const py = cy - Math.sin(a) * (p.radius * 0.85);
          const localTemp = temp - Math.sin(a) * 15;
          return <circle key={i} cx={px} cy={py} r={3.5} fill={tempToColor(localTemp, 15, 120)} opacity={0.85} />;
        })
      ) : (
        <>
          {PARTICLES.map((_, i) => {
            const laneY = 60 + (i % 10) * 18;
            const px = cx - 140 + ((time * speedMul * 60 + i * 20) % 300);
            return <circle key={i} cx={px} cy={laneY} r={3.5} fill={tempToColor(temp - 5, 15, 120)} opacity={0.85} />;
          })}
          {/* fan */}
          <g transform={`translate(${cx + 170}, ${cy}) rotate(${(time * speedMul * 300) % 360})`}>
            <circle r={18} fill="none" stroke="#8FA39D" strokeWidth={1.5} />
            {[0, 90, 180, 270].map((deg) => (
              <rect key={deg} x={-3} y={-18} width={6} height={16} fill="#8FA39D" transform={`rotate(${deg})`} />
            ))}
          </g>
          <text x={cx + 150} y={cy + 40} fontSize="9" fill="#8FA39D">
            fan
          </text>
        </>
      )}

      <text x={cx - 150} y={30} fontSize="10" fill="#8FA39D">
        {convType === "natural" ? "Hot fluid rises, cold sinks (buoyancy)" : "Fan drives uniform forced flow"}
      </text>
    </svg>
  );
}
