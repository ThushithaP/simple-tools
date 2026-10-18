import { useEffect, useRef, useState } from "react";
import { SpecificHeatMaterial } from "../types";
import { SPECIFIC_HEAT, specificHeatFromExperiment } from "../physics";
import { SliderField, SelectField, StatGrid, EquationBox, MisconceptionTip, PlaybackControls } from "../components/Controls";
import Chart from "../components/Chart";
import FullscreenPanel from "../../../components/FullscreenPanel";

export default function SpecificHeatMode() {
  const [material, setMaterial] = useState<SpecificHeatMaterial>("water");
  const [massKg, setMassKg] = useState(1);
  const [powerW, setPowerW] = useState(100);
  const [initialTempC, setInitialTempC] = useState(20);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);

  const actualC = SPECIFIC_HEAT[material];
  const timeRef = useRef(0);
  const historyRef = useRef<{ t: number; measuredTemp: number; trueTemp: number }[]>([{ t: 0, measuredTemp: initialTempC, trueTemp: initialTempC }]);
  const [, forceRender] = useState(0);

  function reset() {
    timeRef.current = 0;
    historyRef.current = [{ t: 0, measuredTemp: initialTempC, trueTemp: initialTempC }];
    setRunning(true);
  }

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material, massKg, powerW, initialTempC]);

  useEffect(() => {
    let raf: number;
    let lastTs: number | null = null;
    function frame(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000) * speed;
      lastTs = ts;
      if (running && timeRef.current < 600) {
        timeRef.current = Math.min(600, timeRef.current + dt);
        const trueTemp = initialTempC + (powerW * timeRef.current) / (massKg * actualC);
        const noise = (Math.sin(timeRef.current * 37.1) + Math.sin(timeRef.current * 91.7)) * 0.15;
        const measuredTemp = trueTemp + noise;
        historyRef.current.push({ t: timeRef.current, measuredTemp, trueTemp });
        if (historyRef.current.length > 400) historyRef.current.shift();
      }
      forceRender((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, initialTempC, powerW, massKg, actualC]);

  const latest = historyRef.current[historyRef.current.length - 1];
  const energyInput = powerW * timeRef.current;
  const deltaT = latest.measuredTemp - initialTempC;
  const calculatedC = specificHeatFromExperiment(powerW, timeRef.current, massKg, deltaT);
  const percentError = Number.isFinite(calculatedC) ? (Math.abs(calculatedC - actualC) / actualC) * 100 : 0;

  const tempPoints = historyRef.current.map((p) => ({ x: p.t, y: p.measuredTemp }));
  const maxTempSeen = Math.max(...historyRef.current.map((p) => p.measuredTemp), initialTempC + 10);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SelectField
          label="Material"
          value={material}
          onChange={setMaterial}
          options={(Object.keys(SPECIFIC_HEAT) as SpecificHeatMaterial[]).map((m) => ({ value: m, label: `${m[0].toUpperCase()}${m.slice(1)} (c=${SPECIFIC_HEAT[m]})` }))}
        />
        <SliderField label="Mass" unit=" kg" min={0.1} max={5.0} step={0.1} value={massKg} onChange={setMassKg} />
        <SliderField label="Heater power" unit=" W" min={10} max={1000} step={10} value={powerW} onChange={setPowerW} />
        <SliderField label="Initial temperature" unit=" °C" min={0} max={100} step={1} value={initialTempC} onChange={setInitialTempC} />
        <PlaybackControls running={running} onToggleRunning={() => setRunning((r) => !r)} onReset={reset} speed={speed} onSpeedChange={setSpeed} />

        <EquationBox
          lines={[
            `Q = m c ΔT = P × t = ${energyInput.toFixed(0)} J`,
            `c = Q/(mΔT) = ${Number.isFinite(calculatedC) ? calculatedC.toFixed(0) : "—"} J/kg·K`,
            `Actual c (${material}) = ${actualC} J/kg·K`,
          ]}
        />
        <MisconceptionTip wrong="Specific heat is how much heat something can hold." right="Specific heat is how much energy is needed to raise temperature — high c means the temperature changes slowly." />
      </div>

      <div className="space-y-6">
        <FullscreenPanel>
          <HeaterVisual temp={latest.measuredTemp} initialTemp={initialTempC} powerW={powerW} running={running} />
        </FullscreenPanel>

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Temperature vs. time</div>
          <Chart series={[{ points: tempPoints, color: "#E8A33D" }]} xLabel="t (s)" yLabel="°C" xMax={600} yMin={Math.min(0, initialTempC - 5)} yMax={maxTempSeen + 5} />
        </div>

        <StatGrid
          stats={[
            { label: "Time elapsed", value: `${timeRef.current.toFixed(1)} s` },
            { label: "Temperature", value: `${latest.measuredTemp.toFixed(1)} °C` },
            { label: "ΔT", value: `${deltaT.toFixed(1)} °C` },
            { label: "Energy input (Q)", value: `${energyInput.toFixed(0)} J` },
            { label: "Calculated c", value: Number.isFinite(calculatedC) ? `${calculatedC.toFixed(0)} J/kg·K` : "—" },
            { label: "% error vs actual", value: `${percentError.toFixed(1)}%`, muted: percentError < 5 },
          ]}
        />
      </div>
    </div>
  );
}

function HeaterVisual({ temp, initialTemp, powerW, running }: { temp: number; initialTemp: number; powerW: number; running: boolean }) {
  const W = 320;
  const H = 220;
  const fillFrac = Math.max(0.1, Math.min(1, (temp - Math.min(0, initialTemp - 10)) / 130));
  const glow = running ? Math.min(1, powerW / 500) : 0.1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Material being heated">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      <rect x={100} y={30} width={120} height={150} fill="none" stroke="#8FA39D" strokeWidth={2} />
      <rect x={104} y={180 - fillFrac * 146} width={112} height={fillFrac * 146} fill="#4A90E288" />
      <rect x={130} y={190} width={60} height={14} fill="#E85A4A" opacity={0.3 + glow * 0.7} style={{ filter: `drop-shadow(0 0 ${glow * 10}px #E85A4A)` }} />
      <text x={132} y={210} fontSize="9" fill="#E8A33D">
        heater
      </text>
      <text x={104} y={22} fontSize="11" fill="#ECF2F0">
        {temp.toFixed(1)}°C
      </text>
    </svg>
  );
}
