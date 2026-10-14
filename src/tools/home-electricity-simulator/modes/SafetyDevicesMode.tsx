import { useMemo, useState } from "react";
import { McbType, fuseTripTime, mcbTripTime, rcdTripTime, shockSeverity } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";

const BODY_RESISTANCE_OHM = 1000; // typical wet-skin approximation for teaching purposes

export default function SafetyDevicesMode() {
  const [faultCurrentA, setFaultCurrentA] = useState(9);
  const [fuseRatingA, setFuseRatingA] = useState(6);
  const [mcbRatingA, setMcbRatingA] = useState(6);
  const [mcbType, setMcbType] = useState<McbType>("B");
  const [leakageMa, setLeakageMa] = useState(0);
  const [rcdSensitivityMa, setRcdSensitivityMa] = useState(30);
  const [earthed, setEarthed] = useState(true);
  const supplyV = 230; // mains voltage assumption for this mode's shock-current illustration

  const fuse = useMemo(() => fuseTripTime(faultCurrentA, fuseRatingA), [faultCurrentA, fuseRatingA]);
  const mcb = useMemo(() => mcbTripTime(faultCurrentA, mcbRatingA, mcbType), [faultCurrentA, mcbRatingA, mcbType]);
  const rcd = useMemo(() => rcdTripTime(leakageMa, rcdSensitivityMa), [leakageMa, rcdSensitivityMa]);

  const shockCurrentMa = earthed ? 0 : (supplyV / BODY_RESISTANCE_OHM) * 1000;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SliderField label="Fault / load current" unit=" A" min={0} max={100} step={0.5} value={faultCurrentA} onChange={setFaultCurrentA} />
        <SliderField label="Fuse rating" unit=" A" min={1} max={30} step={1} value={fuseRatingA} onChange={setFuseRatingA} />
        <SliderField label="MCB rating" unit=" A" min={6} max={63} step={1} value={mcbRatingA} onChange={setMcbRatingA} />
        <SegmentedField
          label="MCB type"
          value={mcbType}
          onChange={setMcbType}
          options={[
            { value: "B", label: "Type B" },
            { value: "C", label: "Type C" },
            { value: "D", label: "Type D" },
          ]}
        />
        <SliderField label="Earth leakage current" unit=" mA" min={0} max={200} step={1} value={leakageMa} onChange={setLeakageMa} />
        <SegmentedField
          label="RCD sensitivity"
          value={String(rcdSensitivityMa) as "10" | "30" | "100" | "300"}
          onChange={(v) => setRcdSensitivityMa(Number(v))}
          options={[
            { value: "10", label: "10mA" },
            { value: "30", label: "30mA" },
            { value: "100", label: "100mA" },
            { value: "300", label: "300mA" },
          ]}
        />
        <button
          onClick={() => setEarthed((e) => !e)}
          className={`w-full rounded border py-2 text-sm min-h-[44px] transition-colors ${
            earthed ? "bg-[#5FC7B8] border-[#5FC7B8] text-[#0D1412]" : "bg-[#E85A4A] border-[#E85A4A] text-[#0D1412]"
          }`}
        >
          Earthing: {earthed ? "Connected (safe)" : "Disconnected (dangerous)"}
        </button>

        <EquationBox lines={[`Fuse/MCB: t ∝ 1/I² (inverse time)`, `RCD trips when |I_live − I_neutral| > I_Δn`, `Shock current ≈ V / R_body`]} />
        <MisconceptionTip wrong="A fuse protects you from electric shock." right="Fuses protect against overload/short circuit (fire risk). Earthing and RCDs protect against shock." />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <SafetyDiagram fuseBlown={fuse.tripped} mcbTripped={mcb.tripped} rcdTripped={rcd.tripped} earthed={earthed} faultActive={faultCurrentA > Math.min(fuseRatingA, mcbRatingA) || leakageMa > 0} />
        </div>

        {!earthed && leakageMa === 0 && faultCurrentA > mcbRatingA && (
          <div className="rounded border border-[#E85A4A] bg-[#E85A4A22] p-3 text-xs text-[#E85A4A]">
            Casing is live — a person touching it would carry ≈{shockCurrentMa.toFixed(0)} mA: {shockSeverity(shockCurrentMa)}
          </div>
        )}

        <StatGrid
          stats={[
            { label: "Fuse", value: fuse.tripped ? `Blown (${fuse.tripTimeMs!.toFixed(0)} ms)` : "Intact", warn: fuse.tripped },
            { label: "MCB", value: mcb.tripped ? `Tripped (${mcb.mechanism}, ${mcb.tripTimeMs!.toFixed(0)} ms)` : "ON", warn: mcb.tripped },
            { label: "RCD", value: rcd.tripped ? `Tripped (${rcd.tripTimeMs!.toFixed(0)} ms)` : "ON", warn: rcd.tripped },
            { label: "Fault current", value: `${faultCurrentA.toFixed(1)} A` },
            { label: "Leakage", value: `${leakageMa.toFixed(0)} mA`, warn: leakageMa >= rcdSensitivityMa },
            { label: "Earthing", value: earthed ? "Connected" : "Disconnected", warn: !earthed },
          ]}
        />
      </div>
    </div>
  );
}

function SafetyDiagram({
  fuseBlown,
  mcbTripped,
  rcdTripped,
  earthed,
  faultActive,
}: {
  fuseBlown: boolean;
  mcbTripped: boolean;
  rcdTripped: boolean;
  earthed: boolean;
  faultActive: boolean;
}) {
  const W = 720;
  const H = 280;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Safety devices diagram">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />

      {/* fuse */}
      <text x={40} y={30} fontSize="10" fill="#8FA39D">
        Fuse
      </text>
      <rect x={40} y={40} width={80} height={20} fill="none" stroke="#8FA39D" strokeWidth={1.5} />
      <line x1={45} y1={50} x2={115} y2={50} stroke={fuseBlown ? "#3A2020" : "#E8A33D"} strokeWidth={fuseBlown ? 1 : 3} strokeDasharray={fuseBlown ? "3 3" : undefined} />
      <text x={40} y={78} fontSize="9" fill={fuseBlown ? "#E85A4A" : "#5FC7B8"}>
        {fuseBlown ? "BLOWN" : "intact"}
      </text>

      {/* MCB */}
      <text x={220} y={30} fontSize="10" fill="#8FA39D">
        MCB
      </text>
      <rect x={220} y={40} width={60} height={40} fill="none" stroke="#8FA39D" strokeWidth={1.5} />
      <line x1={250} y1={70} x2={mcbTripped ? 265 : 250} y2={mcbTripped ? 50 : 45} stroke={mcbTripped ? "#E85A4A" : "#5FC7B8"} strokeWidth={3} />
      <text x={220} y={94} fontSize="9" fill={mcbTripped ? "#E85A4A" : "#5FC7B8"}>
        {mcbTripped ? "TRIPPED" : "ON"}
      </text>

      {/* RCD */}
      <text x={360} y={30} fontSize="10" fill="#8FA39D">
        RCD
      </text>
      <rect x={360} y={40} width={60} height={40} fill="none" stroke="#8FA39D" strokeWidth={1.5} />
      <circle cx={390} cy={60} r={6} fill={rcdTripped ? "#E85A4A" : "#5FC7B8"} />
      <text x={360} y={94} fontSize="9" fill={rcdTripped ? "#E85A4A" : "#5FC7B8"}>
        {rcdTripped ? "TRIPPED" : "ON"}
      </text>

      {/* appliance casing + earthing */}
      <text x={500} y={30} fontSize="10" fill="#8FA39D">
        Appliance casing
      </text>
      <rect x={500} y={40} width={90} height={70} fill={!earthed && faultActive ? "#E85A4A33" : "#1A2422"} stroke={!earthed && faultActive ? "#E85A4A" : "#8FA39D"} strokeWidth={1.5} />
      <text x={510} y={80} fontSize="9" fill={!earthed && faultActive ? "#E85A4A" : "#5C726C"}>
        {!earthed && faultActive ? "LIVE!" : "safe"}
      </text>

      {/* earth wire */}
      <line x1={545} y1={110} x2={545} y2={180} stroke={earthed ? "#B8C24A" : "#3A4B48"} strokeWidth={2} strokeDasharray={earthed ? undefined : "4 4"} />
      <text x={555} y={150} fontSize="9" fill={earthed ? "#B8C24A" : "#5C726C"}>
        {earthed ? "Earth wire (fault current → ground)" : "Earth wire disconnected"}
      </text>
      <line x1={520} y1={190} x2={570} y2={190} stroke="#5C726C" strokeWidth={2} />
      <text x={520} y={205} fontSize="9" fill="#5C726C">
        Ground
      </text>

      {faultActive && earthed && (
        <circle cx={545} cy={140} r={4} fill="#E8A33D">
          <animate attributeName="cy" values="115;180;115" dur="0.6s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}
