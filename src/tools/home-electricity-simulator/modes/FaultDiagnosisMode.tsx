import { useMemo, useState } from "react";
import { FaultType } from "../types";
import { faultSymptoms } from "../physics";
import { SelectField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import FullscreenPanel from "../../../components/FullscreenPanel";

const FAULT_LABELS: Record<FaultType, string> = {
  none: "No fault",
  "short-circuit": "Short circuit",
  overload: "Overload",
  "earth-fault": "Earth fault",
  leakage: "Leakage",
  "open-circuit": "Open circuit",
  "loose-connection": "Loose connection",
};

const FAULT_KEYS = Object.keys(FAULT_LABELS) as FaultType[];

type MeterMode = "voltmeter" | "ammeter" | "ohmmeter" | "continuity";
type TestPoint = "before" | "after";

export default function FaultDiagnosisMode() {
  const [supplyV] = useState(230);
  const [actualFault, setActualFault] = useState<FaultType>(() => FAULT_KEYS[1 + Math.floor(Math.random() * (FAULT_KEYS.length - 1))]);
  const [meterMode, setMeterMode] = useState<MeterMode>("voltmeter");
  const [testPoint, setTestPoint] = useState<TestPoint>("before");
  const [guess, setGuess] = useState<FaultType>("none");
  const [revealed, setRevealed] = useState(false);

  const symptoms = useMemo(() => faultSymptoms(actualFault, supplyV), [actualFault, supplyV]);

  function newFault() {
    const next = FAULT_KEYS[1 + Math.floor(Math.random() * (FAULT_KEYS.length - 1))];
    setActualFault(next);
    setGuess("none");
    setRevealed(false);
  }

  const reading = useMemo(() => {
    if (testPoint === "before") {
      // source side always reads normal — the fault is downstream
      if (meterMode === "voltmeter") return `${supplyV.toFixed(0)} V`;
      if (meterMode === "ammeter") return "— (open the circuit to insert an ammeter)";
      if (meterMode === "continuity") return "Continuous (beep)";
      return "Power must be OFF to measure resistance";
    }
    // after the fault point
    if (meterMode === "voltmeter") return `${symptoms.voltageAtLoad.toFixed(0)} V`;
    if (meterMode === "ammeter") return symptoms.currentA > 100 ? "OVER RANGE (fault!)" : `${symptoms.currentA.toFixed(2)} A`;
    if (meterMode === "continuity") return symptoms.continuity ? "Continuous (beep)" : "Open (no beep)";
    return symptoms.resistanceOhm === Infinity ? "OL (infinite — open circuit)" : `${symptoms.resistanceOhm?.toFixed(1)} Ω`;
  }, [testPoint, meterMode, symptoms, supplyV]);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <button
          onClick={newFault}
          className="w-full rounded border border-[#2A3A37] bg-[#17211F] py-2 text-sm text-[#ECF2F0] hover:border-[#5FC7B8] transition-colors min-h-[44px]"
        >
          🎲 New random fault
        </button>

        <SegmentedField
          label="Meter mode"
          value={meterMode}
          onChange={setMeterMode}
          options={[
            { value: "voltmeter", label: "V" },
            { value: "ammeter", label: "A" },
            { value: "ohmmeter", label: "Ω" },
            { value: "continuity", label: "🔊" },
          ]}
        />
        <SegmentedField
          label="Test point"
          value={testPoint}
          onChange={setTestPoint}
          options={[
            { value: "before", label: "Before load" },
            { value: "after", label: "At load" },
          ]}
        />

        <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 text-center">
          <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Multimeter reading</div>
          <div className="font-mono text-lg text-[#5FC7B8]">{reading}</div>
        </div>

        <SelectField label="Your diagnosis" value={guess} onChange={setGuess} options={FAULT_KEYS.filter((k) => k !== "none").map((k) => ({ value: k, label: FAULT_LABELS[k] }))} />
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded border border-[#2A3A37] bg-[#17211F] py-2 text-sm text-[#ECF2F0] hover:border-[#5FC7B8] transition-colors min-h-[44px]"
        >
          Check answer
        </button>
        {revealed && (
          <div className={`rounded border p-3 text-xs ${guess === actualFault ? "border-[#5FC7B8] text-[#5FC7B8]" : "border-[#E85A4A] text-[#E85A4A]"}`}>
            {guess === actualFault ? "Correct! " : `Not quite — it was ${FAULT_LABELS[actualFault]}. `}
            {symptoms.description}
          </div>
        )}

        <EquationBox lines={[`V = I × R (Ohm's law)`, `Insulation resistance should be > 1 MΩ`, `Always isolate supply before resistance measurements`]} />
        <MisconceptionTip
          wrong="If the MCB doesn't trip, the circuit is safe."
          right="High-resistance faults (loose connections) may not draw enough current to trip the MCB but can still overheat and cause fire."
        />
      </div>

      <div className="space-y-6">
        <FullscreenPanel>
          <FaultCircuitDiagram testPoint={testPoint} faultActive={actualFault !== "none"} />
        </FullscreenPanel>

        <StatGrid
          stats={[
            { label: "Supply", value: `${supplyV} V` },
            { label: "Voltage at load", value: `${symptoms.voltageAtLoad.toFixed(0)} V` },
            { label: "Current", value: symptoms.currentA > 100 ? "very high" : `${symptoms.currentA.toFixed(2)} A`, warn: symptoms.currentA > 20 },
            { label: "Continuity", value: symptoms.continuity ? "Yes" : "No" },
            { label: "Resistance", value: symptoms.resistanceOhm === Infinity ? "∞ (open)" : `${symptoms.resistanceOhm?.toFixed(1)} Ω` },
          ]}
        />
      </div>
    </div>
  );
}

function FaultCircuitDiagram({ testPoint, faultActive }: { testPoint: TestPoint; faultActive: boolean }) {
  const W = 500;
  const H = 160;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Fault diagnosis circuit">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      <rect x={20} y={60} width={40} height={40} fill="none" stroke="#8FA39D" strokeWidth={2} />
      <text x={16} y={55} fontSize="9" fill="#8FA39D">
        Supply
      </text>
      <line x1={60} y1={80} x2={200} y2={80} stroke="#B5652A" strokeWidth={2} />
      <circle cx={200} cy={80} r={6} fill={testPoint === "before" ? "#5FC7B8" : "#3A4B48"} stroke="#ECF2F0" strokeWidth={1} />
      <text x={185} y={105} fontSize="9" fill="#8FA39D">
        Before
      </text>

      {/* fault marker */}
      {faultActive && (
        <text x={225} y={70} fontSize="14" fill="#E8A33D">
          ⚡
        </text>
      )}
      <line x1={200} y1={80} x2={340} y2={80} stroke={faultActive ? "#E85A4A" : "#B5652A"} strokeWidth={2} strokeDasharray={faultActive ? "4 3" : undefined} />

      <circle cx={340} cy={80} r={6} fill={testPoint === "after" ? "#5FC7B8" : "#3A4B48"} stroke="#ECF2F0" strokeWidth={1} />
      <text x={320} y={105} fontSize="9" fill="#8FA39D">
        At load
      </text>
      <rect x={370} y={60} width={50} height={40} fill="none" stroke="#8FA39D" strokeWidth={2} />
      <text x={372} y={55} fontSize="9" fill="#8FA39D">
        Load
      </text>
      <line x1={420} y1={80} x2={460} y2={80} stroke="#B5652A" strokeWidth={2} />
    </svg>
  );
}
