import { useEffect, useMemo, useRef, useState } from "react";
import { Phase, PhaseChangeSubstance } from "../types";
import { SUBSTANCES, boilingPointAtPressure, simulatePhaseChange } from "../physics";
import { SliderField, SelectField, SegmentedField, StatGrid, EquationBox, MisconceptionTip, PlaybackControls } from "../components/Controls";
import Chart from "../components/Chart";
import FullscreenPanel from "../../../components/FullscreenPanel";

type StartPhase = "solid" | "liquid" | "gas";
type Direction = "heat" | "cool";

const PHASE_COLOR: Record<Phase, string> = {
  solid: "#4A90E2",
  melting: "#5FC7B8",
  liquid: "#6FCF7A",
  boiling: "#E8A33D",
  gas: "#E85A4A",
};

export default function PhaseChangeMode() {
  const [substanceKey, setSubstanceKey] = useState<PhaseChangeSubstance>("water");
  const [massKg, setMassKg] = useState(0.1);
  const [powerW, setPowerW] = useState(100);
  const [startPhase, setStartPhase] = useState<StartPhase>("solid");
  const [startTempC, setStartTempC] = useState(-20);
  const [pressureAtm, setPressureAtm] = useState(1.0);
  const [direction, setDirection] = useState<Direction>("heat");
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);

  const baseSubstance = SUBSTANCES[substanceKey];
  const substance = useMemo(
    () => ({ ...baseSubstance, boilingPointC: boilingPointAtPressure(baseSubstance.boilingPointC, pressureAtm) }),
    [baseSubstance, pressureAtm]
  );

  const timeRef = useRef(0);
  const energyRef = useRef(0);
  const [, forceRender] = useState(0);
  const historyRef = useRef<{ t: number; temp: number }[]>([]);

  const extent = direction === "heat" ? substance.boilingPointC + Math.max(50, (substance.boilingPointC - substance.meltingPointC) * 0.3) : substance.meltingPointC - Math.max(50, (substance.boilingPointC - substance.meltingPointC) * 0.3);

  function reset() {
    timeRef.current = 0;
    energyRef.current = 0;
    historyRef.current = [{ t: 0, temp: startTempC }];
    setRunning(true);
  }

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [substanceKey, massKg, powerW, startPhase, startTempC, pressureAtm, direction]);

  useEffect(() => {
    let raf: number;
    let lastTs: number | null = null;
    function frame(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000) * speed;
      lastTs = ts;
      if (running) {
        timeRef.current += dt;
        energyRef.current += powerW * dt;
        const result = simulatePhaseChange(substance, massKg, startPhase, startTempC, energyRef.current, direction, extent);
        historyRef.current.push({ t: timeRef.current, temp: result.tempC });
        if (historyRef.current.length > 1000) historyRef.current.shift();
        if (result.complete) setRunning(false);
      }
      forceRender((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, powerW, substance, massKg, startPhase, startTempC, direction, extent]);

  const result = simulatePhaseChange(substance, massKg, startPhase, startTempC, energyRef.current, direction, extent);
  const tempPoints = historyRef.current.map((p) => ({ x: p.t, y: p.temp }));
  const maxT = Math.max(substance.boilingPointC + 20, startTempC + 10);
  const minT = Math.min(substance.meltingPointC - 20, startTempC - 10);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SelectField
          label="Substance"
          value={substanceKey}
          onChange={setSubstanceKey}
          options={(Object.keys(SUBSTANCES) as PhaseChangeSubstance[]).map((s) => ({ value: s, label: SUBSTANCES[s].label }))}
        />
        <SliderField label="Mass" unit=" kg" min={0.01} max={1.0} step={0.01} value={massKg} onChange={setMassKg} />
        <SliderField label="Heater power" unit=" W" min={10} max={500} step={10} value={powerW} onChange={setPowerW} />
        <SegmentedField
          label="Initial state"
          value={startPhase}
          onChange={setStartPhase}
          options={[
            { value: "solid", label: "Solid" },
            { value: "liquid", label: "Liquid" },
            { value: "gas", label: "Gas" },
          ]}
        />
        <SliderField
          label="Initial temperature"
          unit=" °C"
          min={Math.round(substance.meltingPointC - 60)}
          max={Math.round(substance.boilingPointC + 60)}
          step={1}
          value={startTempC}
          onChange={setStartTempC}
        />
        {substanceKey === "water" && <SliderField label="Pressure" unit=" atm" min={0.5} max={2.0} step={0.05} value={pressureAtm} onChange={setPressureAtm} />}
        <SegmentedField
          label="Process"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "heat", label: "Heating curve" },
            { value: "cool", label: "Cooling curve" },
          ]}
        />
        <PlaybackControls running={running} onToggleRunning={() => setRunning((r) => !r)} onReset={reset} speed={speed} onSpeedChange={setSpeed} />

        <EquationBox
          lines={[
            `Q = mcΔT (sensible) or Q = mL (latent)`,
            `Melting pt = ${substance.meltingPointC.toFixed(0)}°C, Boiling pt = ${substance.boilingPointC.toFixed(0)}°C`,
            `Total energy for full process = ${(result.totalEnergy / 1000).toFixed(1)} kJ`,
          ]}
        />
        <MisconceptionTip wrong="Boiling water is hotter than 100°C." right="Boiling water stays at exactly 100°C (at 1 atm) — extra heat makes it boil faster, not hotter." />
      </div>

      <div className="space-y-6">
        <FullscreenPanel>
          <MolecularView phase={result.phase} />
        </FullscreenPanel>

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Heating/cooling curve</div>
          <Chart
            series={[{ points: tempPoints, color: "#5FC7B8" }]}
            xLabel="t (s)"
            yLabel="°C"
            xMax={Math.max(30, timeRef.current * 1.1)}
            yMin={minT}
            yMax={maxT}
            markerY={[
              { y: substance.meltingPointC, color: "#4A90E2", label: "melting pt" },
              { y: substance.boilingPointC, color: "#E8A33D", label: "boiling pt" },
            ]}
          />
        </div>

        <StatGrid
          stats={[
            { label: "Current temperature", value: `${result.tempC.toFixed(1)} °C` },
            { label: "Current phase", value: result.phase, muted: false },
            { label: "Time elapsed", value: `${timeRef.current.toFixed(1)} s` },
            { label: "Total energy so far", value: `${(result.cumulativeEnergy / 1000).toFixed(2)} kJ` },
            { label: "Melting point", value: `${substance.meltingPointC.toFixed(0)} °C` },
            { label: "Boiling point", value: `${substance.boilingPointC.toFixed(0)} °C` },
          ]}
        />

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Energy breakdown by stage</div>
          {result.stages.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-28 text-[#8FA39D]">{s.name}</div>
              <div className="flex-1 h-3 rounded bg-[#121A18] overflow-hidden">
                <div className="h-full" style={{ width: `${s.fraction * 100}%`, background: PHASE_COLOR[s.phase] }} />
              </div>
              <div className="w-20 text-right font-mono text-[#ECF2F0]">{(s.energy / 1000).toFixed(1)} kJ</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MolecularView({ phase }: { phase: Phase }) {
  const W = 320;
  const H = 180;
  const isSolid = phase === "solid" || phase === "melting";
  const isGas = phase === "gas" || phase === "boiling";
  const color = PHASE_COLOR[phase];

  const particles = useMemo(() => {
    const list: { x: number; y: number; seed: number }[] = [];
    if (isSolid) {
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 6; c++) list.push({ x: 30 + c * 45, y: 30 + r * 40, seed: r * 6 + c });
    } else if (isGas) {
      for (let i = 0; i < 18; i++) list.push({ x: 20 + Math.random() * 280, y: 20 + Math.random() * 140, seed: i });
    } else {
      for (let i = 0; i < 22; i++) list.push({ x: 20 + Math.random() * 280, y: 20 + Math.random() * 140, seed: i });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSolid, isGas]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label={`Molecular view: ${phase}`}>
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      {particles.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill={color}>
          {isGas ? (
            <animate attributeName="cx" values={`${p.x};${p.x + (p.seed % 2 === 0 ? 20 : -20)};${p.x}`} dur={`${0.4 + (p.seed % 5) * 0.1}s`} repeatCount="indefinite" />
          ) : isSolid ? (
            <animate attributeName="cy" values={`${p.y};${p.y + 2};${p.y}`} dur="0.5s" repeatCount="indefinite" />
          ) : (
            <animate attributeName="cx" values={`${p.x};${p.x + 6};${p.x}`} dur="1.2s" repeatCount="indefinite" />
          )}
        </circle>
      ))}
      <text x={8} y={H - 8} fontSize="10" fill={color}>
        {phase === "melting" ? "Melting — lattice breaking down" : phase === "boiling" ? "Boiling — particles escaping" : phase[0].toUpperCase() + phase.slice(1)}
      </text>
    </svg>
  );
}
