import { useMemo, useState } from "react";
import { CircuitTopology } from "../types";
import { analyzeBasicCircuit } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import FullscreenPanel from "../../../components/FullscreenPanel";

export default function BasicCircuitMode() {
  const [topology, setTopology] = useState<CircuitTopology>("series");
  const [numBulbs, setNumBulbs] = useState(3);
  const [voltage, setVoltage] = useState(9);
  const [bulbRatedW, setBulbRatedW] = useState(3);
  const [switchClosed, setSwitchClosed] = useState(true);
  const [failedBulb, setFailedBulb] = useState<number | null>(null);

  const result = useMemo(() => analyzeBasicCircuit(topology, numBulbs, voltage, bulbRatedW), [topology, numBulbs, voltage, bulbRatedW]);

  const seriesBroken = topology === "series" && failedBulb !== null;
  const circuitLive = switchClosed && !seriesBroken;

  function toggleFail(i: number) {
    setFailedBulb((f) => (f === i ? null : i));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Circuit type"
          value={topology}
          onChange={(v) => {
            setTopology(v);
            setFailedBulb(null);
          }}
          options={[
            { value: "series", label: "Series" },
            { value: "parallel", label: "Parallel" },
          ]}
        />
        <SliderField label="Number of bulbs" unit="" min={1} max={10} step={1} value={numBulbs} onChange={setNumBulbs} />
        <SliderField label="Supply voltage" unit=" V" min={1.5} max={24} step={0.5} value={voltage} onChange={setVoltage} />
        <SliderField label="Bulb rating" unit=" W" min={1} max={100} step={1} value={bulbRatedW} onChange={setBulbRatedW} />
        <button
          onClick={() => setSwitchClosed((s) => !s)}
          className={`w-full rounded border py-2 text-sm min-h-[44px] transition-colors ${
            switchClosed ? "bg-[#5FC7B8] border-[#5FC7B8] text-[#0D1412]" : "bg-[#0F1614] border-[#2A3A37] text-[#8FA39D]"
          }`}
        >
          Switch: {switchClosed ? "Closed" : "Open"}
        </button>

        <EquationBox
          lines={
            topology === "series"
              ? [`R_total = R×n = ${result.totalResistanceOhm.toFixed(1)} Ω`, `I same everywhere = ${result.totalCurrentA.toFixed(3)} A`, `V_bulb = V×(R/R_total) = ${result.perBulbVoltageV.toFixed(2)} V`]
              : [`1/R_total = n/R → R_total = ${result.totalResistanceOhm.toFixed(2)} Ω`, `V same everywhere = ${result.perBulbVoltageV.toFixed(2)} V`, `I_total = ΣI = ${result.totalCurrentA.toFixed(3)} A`]
          }
        />
        <MisconceptionTip
          wrong="Series wiring is used in homes because it's simpler."
          right="Homes use parallel wiring so each appliance gets full voltage and operates independently — one failure doesn't kill everything else."
        />
      </div>

      <div className="space-y-6">
        <FullscreenPanel>
          <CircuitDiagram
            topology={topology}
            numBulbs={numBulbs}
            brightness={result.brightnessFraction}
            live={circuitLive}
            failedBulb={failedBulb}
            onToggleFail={toggleFail}
          />
          <div className="mt-2 text-center text-[10px] text-[#5C726C]">
            {topology === "series" ? "Click a bulb to simulate it failing (breaks the whole chain)." : "Click a bulb to simulate it failing (others stay lit)."}
          </div>
        </FullscreenPanel>

        <StatGrid
          stats={[
            { label: "Supply V", value: `${voltage} V` },
            { label: "Total current", value: `${result.totalCurrentA.toFixed(3)} A` },
            { label: "Total resistance", value: `${result.totalResistanceOhm.toFixed(1)} Ω` },
            { label: "Voltage per bulb", value: `${result.perBulbVoltageV.toFixed(2)} V` },
            { label: "Current per bulb", value: `${result.perBulbCurrentA.toFixed(3)} A` },
            { label: "Total power", value: `${result.totalPowerW.toFixed(1)} W` },
            {
              label: "Brightness",
              value: !circuitLive ? "OFF" : result.brightnessFraction > 0.85 ? "Bright" : result.brightnessFraction > 0.4 ? "Medium" : "Dim",
            },
          ]}
        />
      </div>
    </div>
  );
}

function CircuitDiagram({
  topology,
  numBulbs,
  brightness,
  live,
  failedBulb,
  onToggleFail,
}: {
  topology: CircuitTopology;
  numBulbs: number;
  brightness: number;
  live: boolean;
  failedBulb: number | null;
  onToggleFail: (i: number) => void;
}) {
  const W = 720;
  const H = 240;
  const bulbR = 16;

  if (topology === "series") {
    const spacing = (W - 120) / Math.max(1, numBulbs - 1 || 1);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Series circuit diagram">
        <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
        <rect x={30} y={H / 2 - 20} width={40} height={40} fill="none" stroke="#8FA39D" strokeWidth={2} />
        <text x={30} y={H / 2 - 26} fontSize="10" fill="#8FA39D">
          Battery
        </text>
        <line x1={70} y1={H / 2} x2={90} y2={H / 2} stroke="#8FA39D" strokeWidth={2} />
        {Array.from({ length: numBulbs }).map((_, i) => {
          const cx = 90 + i * spacing;
          const failed = failedBulb === i;
          const lit = live && !failed;
          const glow = lit ? brightness : 0;
          return (
            <g key={i}>
              {i > 0 && <line x1={90 + (i - 1) * spacing + bulbR} y1={H / 2} x2={cx - bulbR} y2={H / 2} stroke="#8FA39D" strokeWidth={2} />}
              <circle
                cx={cx}
                cy={H / 2}
                r={bulbR}
                fill={failed ? "#3A2020" : `rgba(232,163,61,${0.15 + glow * 0.85})`}
                stroke={failed ? "#E85A4A" : "#E8A33D"}
                strokeWidth={2}
                style={{ cursor: "pointer" }}
                onClick={() => onToggleFail(i)}
              />
              {failed && (
                <text x={cx} y={H / 2 + 4} fontSize="14" fill="#E85A4A" textAnchor="middle">
                  ✕
                </text>
              )}
            </g>
          );
        })}
        <line x1={90 + (numBulbs - 1) * spacing + bulbR} y1={H / 2} x2={W - 30} y2={H / 2} stroke="#8FA39D" strokeWidth={2} />
        <line x1={W - 30} y1={H / 2} x2={W - 30} y2={H - 40} stroke="#8FA39D" strokeWidth={2} />
        <line x1={W - 30} y1={H - 40} x2={50} y2={H - 40} stroke="#8FA39D" strokeWidth={2} />
        <line x1={50} y1={H - 40} x2={50} y2={H / 2 + 20} stroke="#8FA39D" strokeWidth={2} />
      </svg>
    );
  }

  // parallel
  const branchSpacing = (H - 60) / Math.max(1, numBulbs);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Parallel circuit diagram">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      <rect x={30} y={H / 2 - 20} width={40} height={40} fill="none" stroke="#8FA39D" strokeWidth={2} />
      <text x={30} y={H / 2 - 26} fontSize="10" fill="#8FA39D">
        Battery
      </text>
      <line x1={70} y1={H / 2} x2={140} y2={H / 2} stroke="#8FA39D" strokeWidth={2} />
      <line x1={140} y1={30} x2={140} y2={H - 30} stroke="#8FA39D" strokeWidth={2} />
      <line x1={W - 100} y1={30} x2={W - 100} y2={H - 30} stroke="#8FA39D" strokeWidth={2} />
      <line x1={W - 100} y1={H / 2} x2={W - 30} y2={H / 2} stroke="#8FA39D" strokeWidth={2} />
      <line x1={W - 30} y1={H / 2} x2={W - 30} y2={H - 10} stroke="#8FA39D" strokeWidth={2} />
      <line x1={W - 30} y1={H - 10} x2={70} y2={H - 10} stroke="#8FA39D" strokeWidth={2} />
      <line x1={70} y1={H - 10} x2={70} y2={H / 2 + 20} stroke="#8FA39D" strokeWidth={2} />
      {Array.from({ length: numBulbs }).map((_, i) => {
        const cy = 30 + branchSpacing / 2 + i * branchSpacing;
        const failed = failedBulb === i;
        const lit = live && !failed;
        const glow = lit ? brightness : 0;
        const cx = (140 + (W - 100)) / 2;
        return (
          <g key={i}>
            <line x1={140} y1={cy} x2={cx - bulbR} y2={cy} stroke="#8FA39D" strokeWidth={2} />
            <line x1={cx + bulbR} y1={cy} x2={W - 100} y2={cy} stroke="#8FA39D" strokeWidth={2} />
            <circle
              cx={cx}
              cy={cy}
              r={bulbR}
              fill={failed ? "#3A2020" : `rgba(232,163,61,${0.15 + glow * 0.85})`}
              stroke={failed ? "#E85A4A" : "#E8A33D"}
              strokeWidth={2}
              style={{ cursor: "pointer" }}
              onClick={() => onToggleFail(i)}
            />
            {failed && (
              <text x={cx} y={cy + 4} fontSize="14" fill="#E85A4A" textAnchor="middle">
                ✕
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
