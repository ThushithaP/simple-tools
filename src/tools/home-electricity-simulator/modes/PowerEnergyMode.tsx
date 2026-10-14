import { useEffect, useMemo, useRef, useState } from "react";
import { ApplianceKey } from "../types";
import { APPLIANCES, applianceByKey, energyAndCost } from "../physics";
import { SliderField, SelectField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import Chart from "../components/Chart";

const BILLING_DAYS: Record<string, number> = { Day: 1, Week: 7, Month: 30, Year: 365 };

export default function PowerEnergyMode() {
  const [applianceKey, setApplianceKey] = useState<ApplianceKey>("led-bulb");
  const [powerW, setPowerW] = useState(applianceByKey("led-bulb").typicalWatts);
  const [count, setCount] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(5);
  const [tariff, setTariff] = useState(0.15);
  const [billingPeriod, setBillingPeriod] = useState<"Day" | "Week" | "Month" | "Year">("Month");

  const [running, setRunning] = useState(false);
  const [simHours, setSimHours] = useState(0);
  const [history, setHistory] = useState<{ x: number; y: number }[]>([{ x: 0, y: 0 }]);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    setPowerW(applianceByKey(applianceKey).typicalWatts);
  }, [applianceKey]);

  useEffect(() => {
    if (!running) {
      lastTsRef.current = null;
      return;
    }
    let raf: number;
    function step(ts: number) {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dtRealS = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      // 1 real second = 0.2 simulated hours, so a day of usage takes ~5s to watch accumulate
      setSimHours((h) => {
        const next = h + dtRealS * 0.2;
        const clamped = Math.min(next, 24);
        const energy = ((powerW * count) / 1000) * clamped;
        setHistory((prev) => [...prev, { x: clamped, y: energy }].slice(-300));
        return clamped;
      });
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, powerW, count]);

  function reset() {
    setRunning(false);
    setSimHours(0);
    setHistory([{ x: 0, y: 0 }]);
  }

  const billingDays = BILLING_DAYS[billingPeriod];
  const billed = useMemo(() => energyAndCost(powerW, count, hoursPerDay, billingDays, tariff), [powerW, count, hoursPerDay, billingDays, tariff]);

  const liveEnergyKwh = ((powerW * count) / 1000) * simHours;
  const liveCost = liveEnergyKwh * tariff;
  const meterSpinSpeed = Math.max(0.3, Math.min(8, (powerW * count) / 200));

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SelectField label="Appliance" value={applianceKey} onChange={setApplianceKey} options={APPLIANCES.map((a) => ({ value: a.key, label: a.label }))} />
        <SliderField label="Power" unit=" W" min={5} max={5000} step={5} value={powerW} onChange={setPowerW} />
        <SliderField label="Number of units" unit="" min={1} max={20} step={1} value={count} onChange={setCount} />
        <SliderField label="Usage time" unit=" h/day" min={0.5} max={24} step={0.5} value={hoursPerDay} onChange={setHoursPerDay} />
        <SliderField label="Tariff" unit=" /kWh" min={0.05} max={0.5} step={0.01} value={tariff} onChange={setTariff} />
        <SelectField
          label="Billing period"
          value={billingPeriod}
          onChange={setBillingPeriod}
          options={[
            { value: "Day", label: "1 Day" },
            { value: "Week", label: "1 Week" },
            { value: "Month", label: "1 Month" },
            { value: "Year", label: "1 Year" },
          ]}
        />

        <EquationBox
          lines={[
            `E(kWh) = P(kW) × t(h) = ${(billed.instantPowerW / 1000).toFixed(2)} × ${hoursPerDay}×${billingDays}`,
            `E = ${billed.energyKwh.toFixed(2)} kWh`,
            `Cost = E × tariff = ${billed.costCurrency.toFixed(2)}`,
          ]}
        />
        <MisconceptionTip
          wrong="Turning off appliances at the switch saves all energy."
          right="Many appliances draw standby power even when 'off' — unplug or use a switched power strip to eliminate it."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="flex items-center justify-center gap-6">
            <MeterDial spinSpeed={running ? meterSpinSpeed : 0} />
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Live meter reading</div>
              <div className="font-mono text-2xl text-[#ECF2F0]">{liveEnergyKwh.toFixed(3)} kWh</div>
              <div className="font-mono text-sm text-[#5FC7B8]">{liveCost.toFixed(3)} cost units</div>
            </div>
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className="rounded border border-[#2A3A37] bg-[#17211F] px-4 py-2 text-sm text-[#ECF2F0] hover:border-[#5FC7B8] transition-colors min-h-[44px]"
            >
              {running ? "⏸ Pause" : "▶ Run day"}
            </button>
            <button
              onClick={reset}
              className="rounded border border-[#2A3A37] bg-[#17211F] px-4 py-2 text-sm text-[#8FA39D] hover:border-[#E8A33D] hover:text-[#E8A33D] transition-colors min-h-[44px]"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Energy accumulated (simulated day)</div>
          <Chart points={history} xLabel="hours" yLabel="kWh" xMax={24} yMax={Math.max(0.5, (powerW * count * 24) / 1000)} />
        </div>

        <StatGrid
          stats={[
            { label: "Instantaneous power", value: `${(billed.instantPowerW / 1000).toFixed(2)} kW` },
            { label: `Energy (${billingPeriod})`, value: `${billed.energyKwh.toFixed(2)} kWh` },
            { label: `Cost (${billingPeriod})`, value: billed.costCurrency.toFixed(2) },
            { label: "Avg. daily energy", value: `${((billed.instantPowerW / 1000) * hoursPerDay).toFixed(2)} kWh` },
            { label: "Peak demand", value: `${(billed.instantPowerW / 1000).toFixed(2)} kW` },
          ]}
        />
      </div>
    </div>
  );
}

function MeterDial({ spinSpeed }: { spinSpeed: number }) {
  return (
    <svg viewBox="0 0 100 100" width="90" height="90" role="img" aria-label="Electricity meter disk">
      <circle cx={50} cy={50} r={44} fill="none" stroke="#3A4B48" strokeWidth={3} />
      <g style={{ transformOrigin: "50px 50px", animation: spinSpeed > 0 ? `spin ${Math.max(0.3, 3 / spinSpeed)}s linear infinite` : undefined }}>
        <line x1={50} y1={50} x2={50} y2={14} stroke="#5FC7B8" strokeWidth={3} />
        <circle cx={50} cy={50} r={3} fill="#5FC7B8" />
      </g>
      <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
    </svg>
  );
}
