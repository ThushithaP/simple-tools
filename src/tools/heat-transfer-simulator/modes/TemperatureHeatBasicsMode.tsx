import { useEffect, useRef, useState } from "react";
import { SpecificHeatMaterial } from "../types";
import { SPECIFIC_HEAT, equilibriumTemp } from "../physics";
import { SliderField, SelectField, SegmentedField, StatGrid, EquationBox, MisconceptionTip, PlaybackControls } from "../components/Controls";
import { tempToColor } from "../components/tempColor";

const AMBIENT_C = 22;
const COUPLING = 8; // W/K, arbitrary but tuned for a watchable few-second approach

interface Particle {
  baseX: number;
  baseY: number;
  phase: number;
}

function makeParticles(n: number): Particle[] {
  const rows = 4;
  const cols = Math.ceil(n / rows);
  const list: Particle[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      list.push({ baseX: 20 + c * (140 / cols), baseY: 20 + r * (120 / rows), phase: Math.random() * Math.PI * 2 });
    }
  }
  return list;
}

const PARTICLES = makeParticles(16);

export default function TemperatureHeatBasicsMode() {
  const [hotTemp, setHotTemp] = useState(100);
  const [coldTemp, setColdTemp] = useState(20);
  const [material, setMaterial] = useState<SpecificHeatMaterial>("water");
  const [mass, setMass] = useState(1);
  const [insulated, setInsulated] = useState(true);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);

  const t1Ref = useRef(hotTemp);
  const t2Ref = useRef(coldTemp);
  const cumulativeQRef = useRef(0);
  const timeRef = useRef(0);
  const equilibriumTimeRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  const c = SPECIFIC_HEAT[material];
  const finalTemp = equilibriumTemp(mass, c, hotTemp, mass, c, coldTemp);

  function reset() {
    t1Ref.current = hotTemp;
    t2Ref.current = coldTemp;
    cumulativeQRef.current = 0;
    timeRef.current = 0;
    equilibriumTimeRef.current = null;
    setRunning(true);
  }

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotTemp, coldTemp, material, mass, insulated]);

  useEffect(() => {
    let raf: number;
    let lastTs: number | null = null;
    function frame(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000) * speed;
      lastTs = ts;
      if (running) {
        timeRef.current += dt;
        const rate = COUPLING * (t1Ref.current - t2Ref.current);
        t1Ref.current -= (rate / (mass * c)) * dt;
        t2Ref.current += (rate / (mass * c)) * dt;
        cumulativeQRef.current += Math.abs(rate) * dt;
        if (!insulated) {
          t1Ref.current = AMBIENT_C + (t1Ref.current - AMBIENT_C) * Math.exp((-1.2 * dt) / (mass * c) * 50);
          t2Ref.current = AMBIENT_C + (t2Ref.current - AMBIENT_C) * Math.exp((-1.2 * dt) / (mass * c) * 50);
        }
        if (equilibriumTimeRef.current === null && Math.abs(t1Ref.current - t2Ref.current) < 0.5) {
          equilibriumTimeRef.current = timeRef.current;
        }
      }
      forceRender((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, mass, c, insulated]);

  const atEquilibrium = Math.abs(t1Ref.current - t2Ref.current) < 0.5;
  const minTemp = Math.min(coldTemp, -50);
  const maxTemp = Math.max(hotTemp, 200);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SliderField label="Hot object temp." unit=" °C" min={20} max={200} step={1} value={hotTemp} onChange={setHotTemp} />
        <SliderField label="Cold object temp." unit=" °C" min={-50} max={50} step={1} value={coldTemp} onChange={setColdTemp} />
        <SelectField
          label="Material"
          value={material}
          onChange={setMaterial}
          options={(Object.keys(SPECIFIC_HEAT) as SpecificHeatMaterial[]).map((m) => ({ value: m, label: `${m[0].toUpperCase()}${m.slice(1)} (c=${SPECIFIC_HEAT[m]})` }))}
        />
        <SliderField label="Mass (each)" unit=" kg" min={0.1} max={10} step={0.1} value={mass} onChange={setMass} />
        <SegmentedField
          label="Environment"
          value={insulated ? "insulated" : "open"}
          onChange={(v) => setInsulated(v === "insulated")}
          options={[
            { value: "insulated", label: "Insulated" },
            { value: "open", label: "Open" },
          ]}
        />
        <PlaybackControls running={running} onToggleRunning={() => setRunning((r) => !r)} onReset={reset} speed={speed} onSpeedChange={setSpeed} />

        <EquationBox
          lines={[
            `T_eq = (m₁c₁T₁+m₂c₂T₂)/(m₁c₁+m₂c₂)`,
            `T_eq = ${finalTemp.toFixed(1)} °C (insulated case)`,
            `Q transferred so far = ${cumulativeQRef.current.toFixed(0)} J`,
          ]}
        />
        <MisconceptionTip wrong="Temperature and heat are the same thing." right="Temperature is average kinetic energy per particle (°C/K). Heat is total energy transferred (Joules)." />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <ParticleBoxes t1={t1Ref.current} t2={t2Ref.current} minTemp={minTemp} maxTemp={maxTemp} time={timeRef.current} />
        </div>

        <StatGrid
          stats={[
            { label: "T (hot object)", value: `${t1Ref.current.toFixed(1)} °C` },
            { label: "T (cold object)", value: `${t2Ref.current.toFixed(1)} °C` },
            { label: "ΔT", value: `${Math.abs(t1Ref.current - t2Ref.current).toFixed(1)} °C` },
            { label: "Heat transferred (Q)", value: `${cumulativeQRef.current.toFixed(0)} J` },
            { label: "Thermal equilibrium?", value: atEquilibrium ? "Yes" : "No" },
            { label: "Time to equilibrium", value: equilibriumTimeRef.current !== null ? `${equilibriumTimeRef.current.toFixed(1)} s` : "—" },
          ]}
        />
      </div>
    </div>
  );
}

function ParticleBoxes({ t1, t2, minTemp, maxTemp, time }: { t1: number; t2: number; minTemp: number; maxTemp: number; time: number }) {
  const W = 720;
  const H = 260;
  const color1 = tempToColor(t1, minTemp, maxTemp);
  const color2 = tempToColor(t2, minTemp, maxTemp);
  const jitter1 = 1 + Math.max(0, (t1 + 50) / 50);
  const jitter2 = 1 + Math.max(0, (t2 + 50) / 50);

  function particleDots(offsetX: number, jitter: number, color: string) {
    return PARTICLES.map((p, i) => {
      const dx = Math.sin(time * jitter * 3 + p.phase) * jitter * 1.5;
      const dy = Math.cos(time * jitter * 3.3 + p.phase) * jitter * 1.5;
      return <circle key={i} cx={offsetX + p.baseX + dx} cy={40 + p.baseY + dy} r={4} fill={color} />;
    });
  }

  const rate = t1 - t2;
  const arrowOn = Math.abs(rate) > 0.3;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Two objects exchanging heat">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      <rect x={20} y={20} width={180} height={160} fill={`${color1}22`} stroke={color1} strokeWidth={2} />
      {particleDots(20, jitter1, color1)}
      <text x={30} y={195} fontSize="11" fill={color1}>
        Hot object: {t1.toFixed(1)}°C
      </text>

      <rect x={W - 200} y={20} width={180} height={160} fill={`${color2}22`} stroke={color2} strokeWidth={2} />
      {particleDots(W - 200, jitter2, color2)}
      <text x={W - 190} y={195} fontSize="11" fill={color2}>
        Cold object: {t2.toFixed(1)}°C
      </text>

      {arrowOn && (
        <>
          <line x1={210} y1={100} x2={W - 210} y2={100} stroke="#E8A33D" strokeWidth={2} markerEnd="url(#heatArrow)" opacity={Math.min(1, Math.abs(rate) / 20)} />
          <defs>
            <marker id="heatArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#E8A33D" />
            </marker>
          </defs>
          <text x={W / 2 - 30} y={90} fontSize="10" fill="#E8A33D">
            heat flow
          </text>
        </>
      )}

      {/* thermometers */}
      <Thermometer x={210} temp={t1} minTemp={minTemp} maxTemp={maxTemp} color={color1} />
      <Thermometer x={W - 240} temp={t2} minTemp={minTemp} maxTemp={maxTemp} color={color2} />
    </svg>
  );
}

function Thermometer({ x, temp, minTemp, maxTemp, color }: { x: number; temp: number; minTemp: number; maxTemp: number; color: string }) {
  const tubeH = 150;
  const fillFrac = Math.max(0.05, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));
  const fillH = tubeH * fillFrac;
  return (
    <g>
      <rect x={x} y={210 - tubeH} width={10} height={tubeH} rx={5} fill="none" stroke="#8FA39D" strokeWidth={1.5} />
      <rect x={x + 1.5} y={210 - fillH} width={7} height={fillH} rx={3} fill={color} />
      <circle cx={x + 5} cy={216} r={7} fill={color} />
    </g>
  );
}
