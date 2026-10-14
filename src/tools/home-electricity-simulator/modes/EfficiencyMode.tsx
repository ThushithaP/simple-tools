import { useMemo, useState } from "react";
import { analyzeEfficiency, paybackYears } from "../physics";
import { SliderField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";

export default function EfficiencyMode() {
  const [oldPowerW, setOldPowerW] = useState(100);
  const [oldEfficiency, setOldEfficiency] = useState(5);
  const [newPowerW, setNewPowerW] = useState(15);
  const [newEfficiency, setNewEfficiency] = useState(40);
  const [hoursPerDay, setHoursPerDay] = useState(5);
  const [daysPerYear, setDaysPerYear] = useState(365);
  const [tariff, setTariff] = useState(0.15);
  const [extraCost, setExtraCost] = useState(5);

  const oldResult = useMemo(() => analyzeEfficiency(oldPowerW, oldEfficiency, hoursPerDay, daysPerYear, tariff), [oldPowerW, oldEfficiency, hoursPerDay, daysPerYear, tariff]);
  const newResult = useMemo(() => analyzeEfficiency(newPowerW, newEfficiency, hoursPerDay, daysPerYear, tariff), [newPowerW, newEfficiency, hoursPerDay, daysPerYear, tariff]);

  const annualSavings = oldResult.annualCost - newResult.annualCost;
  const payback = paybackYears(extraCost, annualSavings);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-[#E85A4A]">Old / inefficient</div>
          <SliderField label="Power" unit=" W" min={5} max={2000} step={5} value={oldPowerW} onChange={setOldPowerW} />
          <SliderField label="Efficiency" unit="%" min={1} max={95} step={1} value={oldEfficiency} onChange={setOldEfficiency} />
        </div>
        <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-[#5FC7B8]">New / efficient</div>
          <SliderField label="Power" unit=" W" min={5} max={2000} step={5} value={newPowerW} onChange={setNewPowerW} />
          <SliderField label="Efficiency" unit="%" min={1} max={95} step={1} value={newEfficiency} onChange={setNewEfficiency} />
        </div>
        <SliderField label="Usage" unit=" h/day" min={0.5} max={24} step={0.5} value={hoursPerDay} onChange={setHoursPerDay} />
        <SliderField label="Days per year" unit="" min={30} max={365} step={5} value={daysPerYear} onChange={setDaysPerYear} />
        <SliderField label="Tariff" unit=" /kWh" min={0.05} max={0.5} step={0.01} value={tariff} onChange={setTariff} />
        <SliderField label="Extra purchase cost" unit="" min={0} max={200} step={5} value={extraCost} onChange={setExtraCost} />

        <EquationBox lines={[`η = P_out/P_in × 100%`, `Savings/yr = Cost_old − Cost_new = ${annualSavings.toFixed(2)}`, `Payback = extra cost / savings = ${payback !== null ? payback.toFixed(1) + " yr" : "—"}`]} />
        <MisconceptionTip
          wrong="Energy-saving appliances cost more, so they're not worth it."
          right="The higher upfront cost is usually recovered within a few years through lower electricity bills — see the payback period."
        />
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
            <div className="mb-2 text-center text-[11px] uppercase tracking-wide text-[#E85A4A]">Old / inefficient</div>
            <SankeyFlow inputW={oldPowerW} outputW={oldResult.outputPowerW} wasteW={oldResult.wastedPowerW} color="#E85A4A" />
          </div>
          <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
            <div className="mb-2 text-center text-[11px] uppercase tracking-wide text-[#5FC7B8]">New / efficient</div>
            <SankeyFlow inputW={newPowerW} outputW={newResult.outputPowerW} wasteW={newResult.wastedPowerW} color="#5FC7B8" />
          </div>
        </div>

        <StatGrid
          stats={[
            { label: "Old: annual energy", value: `${oldResult.annualEnergyKwh.toFixed(0)} kWh` },
            { label: "New: annual energy", value: `${newResult.annualEnergyKwh.toFixed(0)} kWh` },
            { label: "Old: annual cost", value: oldResult.annualCost.toFixed(2) },
            { label: "New: annual cost", value: newResult.annualCost.toFixed(2) },
            { label: "Old: star rating", value: `${"★".repeat(oldResult.starRating)}${"☆".repeat(5 - oldResult.starRating)}` },
            { label: "New: star rating", value: `${"★".repeat(newResult.starRating)}${"☆".repeat(5 - newResult.starRating)}` },
            { label: "Annual savings", value: annualSavings.toFixed(2) },
            { label: "Payback period", value: payback !== null ? `${payback.toFixed(1)} yr` : "—" },
          ]}
        />
      </div>
    </div>
  );
}

function SankeyFlow({ inputW, outputW, wasteW, color }: { inputW: number; outputW: number; wasteW: number; color: string }) {
  const W = 320;
  const H = 160;
  const inH = 40;
  const outH = Math.max(4, (outputW / Math.max(inputW, 1)) * inH);
  const wasteH = Math.max(4, (wasteW / Math.max(inputW, 1)) * inH);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Energy flow diagram">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      <rect x={10} y={H / 2 - inH / 2} width={50} height={inH} fill={`${color}55`} stroke={color} strokeWidth={1.5} />
      <text x={10} y={H / 2 - inH / 2 - 6} fontSize="9" fill="#8FA39D">
        Input {inputW.toFixed(0)}W
      </text>

      <polygon points={`60,${H / 2 - inH / 2} 60,${H / 2 + inH / 2} 220,${H / 2 - outH / 2} 220,${H / 2 + outH / 2}`} fill={`${color}33`} stroke={color} strokeWidth={1} />
      <rect x={220} y={H / 2 - outH / 2} width={50} height={outH} fill={`${color}88`} stroke={color} strokeWidth={1.5} />
      <text x={222} y={H / 2 - outH / 2 - 6} fontSize="9" fill="#5FC7B8">
        Useful {outputW.toFixed(0)}W
      </text>

      <path d={`M60,${H / 2 - inH / 2} L150,20 L220,20 L220,${20 + wasteH} L150,${20 + wasteH} L60,${H / 2 - inH / 2 + Math.min(inH, wasteH)} Z`} fill="#E8A33D33" stroke="#E8A33D" strokeWidth={1} />
      <text x={150} y={16} fontSize="9" fill="#E8A33D">
        Waste (heat) {wasteW.toFixed(0)}W
      </text>
    </svg>
  );
}
