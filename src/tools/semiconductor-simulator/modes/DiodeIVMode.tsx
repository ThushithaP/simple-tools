import { useEffect, useMemo, useRef, useState } from "react";
import { Material } from "../types";
import { TYPICAL_VF, saturationCurrent, shockleyDiode } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import Chart from "../components/Chart";
import BandBendingDiagram from "../components/BandBendingDiagram";

const V_MIN = -10;
const V_MAX = 1;
const SWEEP_SPEEDS = { Slow: 0.15, Medium: 0.4, Fast: 1.0 } as const;

export default function DiodeIVMode() {
  const [material, setMaterial] = useState<Material>("silicon");
  const [tempK, setTempK] = useState(300);
  const [idealityFactor, setIdealityFactor] = useState(1);
  const [voltage, setVoltage] = useState(0.6);
  const [sweeping, setSweeping] = useState(false);
  const [sweepSpeed, setSweepSpeed] = useState<keyof typeof SWEEP_SPEEDS>("Medium");
  const [trace, setTrace] = useState<{ x: number; y: number }[]>([]);

  const isAmps = useMemo(() => saturationCurrent(material, tempK), [material, tempK]);
  const diode = useMemo(() => shockleyDiode(isAmps, voltage, idealityFactor, tempK), [isAmps, voltage, idealityFactor, tempK]);

  const directionRef = useRef(1);

  useEffect(() => {
    if (!sweeping) return;
    let raf: number;
    function step() {
      setVoltage((v) => {
        let next = v + directionRef.current * SWEEP_SPEEDS[sweepSpeed] * 0.03;
        if (next > V_MAX) {
          next = V_MAX;
          directionRef.current = -1;
        } else if (next < V_MIN) {
          next = V_MIN;
          directionRef.current = 1;
        }
        return next;
      });
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [sweeping, sweepSpeed]);

  useEffect(() => {
    setTrace((t) => {
      const next = [...t, { x: voltage, y: diode.currentA * 1000 }];
      return next.length > 400 ? next.slice(next.length - 400) : next;
    });
  }, [voltage, diode.currentA]);

  function reset() {
    setSweeping(false);
    setVoltage(0.6);
    setTrace([]);
  }

  const knee = TYPICAL_VF[material];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Diode material"
          value={material}
          onChange={setMaterial}
          options={[
            { value: "silicon", label: `Si (${TYPICAL_VF.silicon}V)` },
            { value: "germanium", label: `Ge (${TYPICAL_VF.germanium}V)` },
          ]}
        />
        <SliderField label="Temperature" unit=" K" min={250} max={400} step={5} value={tempK} onChange={setTempK} />
        <SliderField label="Ideality factor (n)" unit="" min={1.0} max={2.0} step={0.05} value={idealityFactor} onChange={setIdealityFactor} />
        <SliderField label="Applied voltage (V)" unit=" V" min={V_MIN} max={V_MAX} step={0.01} value={voltage} onChange={setVoltage} />

        <SegmentedField
          label="Sweep speed"
          value={sweepSpeed}
          onChange={setSweepSpeed}
          options={[
            { value: "Slow", label: "Slow" },
            { value: "Medium", label: "Med" },
            { value: "Fast", label: "Fast" },
          ]}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setSweeping((s) => !s)}
            className="flex-1 rounded border border-[#2A3A37] bg-[#17211F] py-2 text-sm text-[#ECF2F0] hover:border-[#5FC7B8] transition-colors min-h-[44px]"
          >
            {sweeping ? "⏸ Pause sweep" : "▶ Auto-sweep"}
          </button>
          <button
            onClick={reset}
            className="rounded border border-[#2A3A37] bg-[#17211F] px-3 py-2 text-sm text-[#8FA39D] hover:border-[#E8A33D] hover:text-[#E8A33D] transition-colors min-h-[44px]"
          >
            🔄
          </button>
        </div>

        <EquationBox
          lines={[
            `I = Iₛ(e^(V/nV_T) − 1)`,
            `Iₛ = ${isAmps.toExponential(2)} A`,
            `V = ${voltage.toFixed(2)} V → I = ${(diode.currentA * 1000).toExponential(2)} mA`,
          ]}
        />
        <MisconceptionTip
          wrong="Forward voltage of a diode is always exactly 0.7 V."
          right="0.7 V is approximate — actual V_F depends on current, temperature, and diode type (Ge ≈ 0.3 V)."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">I-V Characteristic Curve</div>
          <Chart
            series={[{ points: trace, color: "#5FC7B8" }]}
            xLabel="V (volts)"
            yLabel="I (mA)"
            xMin={V_MIN}
            xMax={V_MAX}
            yMin={-0.5}
            yMax={Math.max(5, diode.currentA * 1000 * 1.2)}
            markerX={[{ x: knee, color: "#E8A33D" }]}
          />
          <div className="mt-1 text-center text-[10px] text-[#5C726C]">Dashed amber line: typical turn-on / "knee" voltage</div>
        </div>

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-[#8FA39D]">Band bending at current bias</div>
          <BandBendingDiagram builtInV={knee} biasV={voltage} />
        </div>

        <StatGrid
          stats={[
            { label: "Applied V", value: `${voltage.toFixed(2)} V` },
            { label: "Current (I)", value: `${(diode.currentA * 1000).toExponential(2)} mA` },
            { label: "Turn-on V_F", value: `${knee.toFixed(2)} V`, muted: true },
            { label: "Dynamic resistance", value: Number.isFinite(diode.dynamicResistanceOhm) ? `${diode.dynamicResistanceOhm.toFixed(1)} Ω` : "∞" },
            { label: "Power (P=VI)", value: `${(diode.powerW * 1000).toExponential(2)} mW` },
            { label: "Region", value: voltage < 0 ? "Reverse bias" : voltage < knee - 0.1 ? "Sub-threshold" : "Forward conducting" },
          ]}
        />
      </div>
    </div>
  );
}
