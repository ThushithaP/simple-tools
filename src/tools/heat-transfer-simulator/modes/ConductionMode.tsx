import { useEffect, useMemo, useRef, useState } from "react";
import { ConductionMaterial } from "../types";
import { THERMAL_CONDUCTIVITY, conductionHeatRate, thermalResistance, createRod, stepRod, stableConductionDt, RodState } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip, PlaybackControls } from "../components/Controls";
import { tempToColor } from "../components/tempColor";
import Chart from "../components/Chart";

const GRID_N = 60;

export default function ConductionMode() {
  const [material, setMaterial] = useState<ConductionMaterial>("copper");
  const [lengthM, setLengthM] = useState(0.5);
  const [areaCm2, setAreaCm2] = useState(10);
  const [hotTemp, setHotTemp] = useState(100);
  const [coldTemp, setColdTemp] = useState(20);
  const [insulatedSides, setInsulatedSides] = useState(true);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);

  const areaM2 = areaCm2 / 10000;
  const k = THERMAL_CONDUCTIVITY[material];

  const rodRef = useRef<RodState>(createRod(GRID_N, lengthM, hotTemp, coldTemp, coldTemp));
  const timeRef = useRef(0);
  const steadyTimeRef = useRef<number | null>(null);
  const [snapshot, setSnapshot] = useState<number[]>(Array.from(rodRef.current.temps));

  function reset() {
    rodRef.current = createRod(GRID_N, lengthM, hotTemp, coldTemp, coldTemp);
    timeRef.current = 0;
    steadyTimeRef.current = null;
    setSnapshot(Array.from(rodRef.current.temps));
    setRunning(true);
  }

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material, lengthM, hotTemp, coldTemp]);

  useEffect(() => {
    let raf: number;
    function frame() {
      const rod = rodRef.current;
      if (running) {
        const physicsDt = stableConductionDt(rod.dx, k);
        const frameDt = (1 / 60) * speed;
        const substeps = Math.max(1, Math.min(400, Math.round(frameDt / physicsDt)));
        for (let s = 0; s < substeps; s++) {
          stepRod(rod, k, physicsDt, hotTemp, coldTemp);
          if (!insulatedSides) {
            for (let i = 1; i < rod.n - 1; i++) {
              rod.temps[i] += (22 - rod.temps[i]) * 0.0003;
            }
          }
          timeRef.current += physicsDt;
        }
        // check near-linear steady state
        if (steadyTimeRef.current === null) {
          const mid = rod.temps[Math.floor(rod.n / 2)];
          const expectedLinear = hotTemp + ((coldTemp - hotTemp) * (rod.n / 2)) / (rod.n - 1);
          if (Math.abs(mid - expectedLinear) < 0.5) steadyTimeRef.current = timeRef.current;
        }
        setSnapshot(Array.from(rod.temps));
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, k, hotTemp, coldTemp, insulatedSides]);

  const heatRate = conductionHeatRate(k, areaM2, hotTemp - coldTemp, lengthM);
  const resistance = thermalResistance(lengthM, k, areaM2);
  const heatFlux = heatRate / areaM2;
  const gradient = (hotTemp - coldTemp) / lengthM;

  const gradientPoints = useMemo(() => snapshot.map((t, i) => ({ x: (i / (GRID_N - 1)) * lengthM, y: t })), [snapshot, lengthM]);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Material"
          value={material}
          onChange={setMaterial}
          options={(Object.keys(THERMAL_CONDUCTIVITY) as ConductionMaterial[]).map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))}
        />
        <SliderField label="Rod length (L)" unit=" m" min={0.1} max={2.0} step={0.05} value={lengthM} onChange={setLengthM} />
        <SliderField label="Cross-section area (A)" unit=" cm²" min={1} max={100} step={1} value={areaCm2} onChange={setAreaCm2} />
        <SliderField label="Hot end temp." unit=" °C" min={20} max={200} step={1} value={hotTemp} onChange={setHotTemp} />
        <SliderField label="Cold end temp." unit=" °C" min={-50} max={50} step={1} value={coldTemp} onChange={setColdTemp} />
        <SegmentedField
          label="Insulation"
          value={insulatedSides ? "insulated" : "bare"}
          onChange={(v) => setInsulatedSides(v === "insulated")}
          options={[
            { value: "insulated", label: "Insulated" },
            { value: "bare", label: "Bare rod" },
          ]}
        />
        <PlaybackControls running={running} onToggleRunning={() => setRunning((r) => !r)} onReset={reset} speed={speed} onSpeedChange={setSpeed} />

        <EquationBox
          lines={[
            `Q/t = kAΔT/L = ${heatRate.toFixed(2)} W`,
            `R = L/(kA) = ${resistance.toExponential(2)} K/W`,
            `q = Q/A = ${heatFlux.toFixed(1)} W/m²`,
          ]}
        />
        <MisconceptionTip wrong="Metals feel cold because they're at a lower temperature." right="Metals are at room temperature like everything else — they feel cold because their high k conducts heat away from your hand fast." />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <RodVisual temps={snapshot} hotTemp={hotTemp} coldTemp={coldTemp} />
        </div>

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Temperature vs. position along rod</div>
          <Chart series={[{ points: gradientPoints, color: "#E8A33D" }]} xLabel="position (m)" yLabel="°C" xMax={lengthM} yMin={Math.min(coldTemp, -10)} yMax={Math.max(hotTemp, 30)} />
        </div>

        <StatGrid
          stats={[
            { label: "T (hot end)", value: `${hotTemp} °C` },
            { label: "T (cold end)", value: `${coldTemp} °C` },
            { label: "Gradient (ΔT/L)", value: `${gradient.toFixed(1)} °C/m` },
            { label: "Heat transfer rate", value: `${heatRate.toFixed(2)} W` },
            { label: "Thermal conductivity", value: `${k} W/m·K` },
            { label: "Thermal resistance", value: `${resistance.toExponential(2)} K/W` },
            { label: "Time to steady state", value: steadyTimeRef.current !== null ? `${steadyTimeRef.current.toFixed(2)} s` : "still transient…" },
          ]}
        />
      </div>
    </div>
  );
}

function RodVisual({ temps, hotTemp, coldTemp }: { temps: number[]; hotTemp: number; coldTemp: number }) {
  const W = 720;
  const H = 140;
  const minT = Math.min(coldTemp, -10);
  const maxT = Math.max(hotTemp, 30);
  const segW = W / temps.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Conduction rod with temperature gradient">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      {temps.map((t, i) => (
        <rect key={i} x={i * segW} y={40} width={segW + 1} height={60} fill={tempToColor(t, minT, maxT)} />
      ))}
      <rect x={0} y={40} width={W} height={60} fill="none" stroke="#8FA39D" strokeWidth={2} />
      <text x={4} y={30} fontSize="11" fill="#E85A4A">
        {hotTemp}°C
      </text>
      <text x={W - 44} y={30} fontSize="11" fill="#4A90E2">
        {coldTemp}°C
      </text>
      <text x={4} y={118} fontSize="9" fill="#8FA39D">
        hot end
      </text>
      <text x={W - 50} y={118} fontSize="9" fill="#8FA39D">
        cold end
      </text>
    </svg>
  );
}
