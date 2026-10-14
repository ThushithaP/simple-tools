import { useMemo, useState } from "react";
import { CoreMaterial, LoadKind, TransformerFidelity } from "../types";
import { analyzeTransformer } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";

export default function TransformerMode() {
  const [primaryV, setPrimaryV] = useState(240);
  const [freqHz, setFreqHz] = useState<50 | 60>(50);
  const [primaryTurns, setPrimaryTurns] = useState(1000);
  const [secondaryTurns, setSecondaryTurns] = useState(200);
  const [coreMaterial, setCoreMaterial] = useState<CoreMaterial>("iron");
  const [loadKind, setLoadKind] = useState<LoadKind>("resistive");
  const [loadOhm, setLoadOhm] = useState(10);
  const [fidelity, setFidelity] = useState<TransformerFidelity>("ideal");

  const result = useMemo(
    () => analyzeTransformer(primaryV, freqHz, primaryTurns, secondaryTurns, coreMaterial, loadOhm, fidelity),
    [primaryV, freqHz, primaryTurns, secondaryTurns, coreMaterial, loadOhm, fidelity]
  );

  const stepType = result.turnsRatio > 1 ? "Step-up" : result.turnsRatio < 1 ? "Step-down" : "1:1 (isolation)";
  const powerFactor = loadKind === "resistive" ? 1 : 0.8;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SliderField label="Primary voltage (V_p)" unit=" V" min={10} max={240} step={5} value={primaryV} onChange={setPrimaryV} />
        <SegmentedField label="Frequency" value={String(freqHz) as "50" | "60"} onChange={(v) => setFreqHz(Number(v) as 50 | 60)} options={[{ value: "50", label: "50Hz" }, { value: "60", label: "60Hz" }]} />
        <SliderField label="Primary turns (N_p)" unit="" min={100} max={1000} step={10} value={primaryTurns} onChange={setPrimaryTurns} />
        <SliderField label="Secondary turns (N_s)" unit="" min={100} max={2000} step={10} value={secondaryTurns} onChange={setSecondaryTurns} />
        <SegmentedField
          label="Core material"
          value={coreMaterial}
          onChange={setCoreMaterial}
          options={[
            { value: "air", label: "Air" },
            { value: "iron", label: "Iron" },
            { value: "ferrite", label: "Ferrite" },
          ]}
        />
        <SegmentedField
          label="Load type"
          value={loadKind}
          onChange={setLoadKind}
          options={[
            { value: "resistive", label: "Resistive" },
            { value: "inductive", label: "Inductive" },
            { value: "capacitive", label: "Capacitive" },
          ]}
        />
        <SliderField label="Load resistance" unit=" Ω" min={1} max={1000} step={1} value={loadOhm} onChange={setLoadOhm} />
        <SegmentedField
          label="Fidelity"
          value={fidelity}
          onChange={setFidelity}
          options={[
            { value: "ideal", label: "Ideal" },
            { value: "real", label: "Real (losses)" },
          ]}
        />

        <EquationBox
          lines={[
            `V_s/V_p = N_s/N_p = ${result.turnsRatio.toFixed(2)}`,
            `V_s = ${result.secondaryVoltageV.toFixed(1)} V`,
            `I_s/I_p = N_p/N_s → I_p = ${result.primaryCurrentA.toFixed(3)} A`,
          ]}
        />
        <MisconceptionTip
          wrong="A transformer works with a DC supply."
          right="Transformers need changing flux (AC) — a steady DC current gives constant flux, so no EMF is induced in the secondary."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <TransformerDiagram primaryTurns={primaryTurns} secondaryTurns={secondaryTurns} coreMaterial={coreMaterial} stepType={stepType} />
        </div>

        <StatGrid
          stats={[
            { label: "Primary V (rms)", value: `${primaryV.toFixed(0)} V` },
            { label: "Secondary V (rms)", value: `${result.secondaryVoltageV.toFixed(1)} V` },
            { label: "Primary I", value: `${result.primaryCurrentA.toFixed(3)} A` },
            { label: "Secondary I", value: `${result.secondaryCurrentA.toFixed(3)} A` },
            { label: "Turns ratio (a)", value: result.turnsRatio.toFixed(2) },
            { label: "Type", value: stepType },
            { label: "Input power", value: `${(result.inputPowerW * powerFactor).toFixed(1)} W` },
            { label: "Output power", value: `${(result.outputPowerW * powerFactor).toFixed(1)} W` },
            { label: "Efficiency", value: `${result.efficiencyPercent.toFixed(1)}%` },
            { label: "Core flux (max)", value: `${result.fluxMaxWb.toExponential(2)} Wb` },
            { label: "Core flux density", value: `${result.coreFluxDensityT.toFixed(2)} T` },
            { label: "Power factor", value: powerFactor.toFixed(2), muted: loadKind === "resistive" },
          ]}
        />
      </div>
    </div>
  );
}

function TransformerDiagram({
  primaryTurns,
  secondaryTurns,
  coreMaterial,
  stepType,
}: {
  primaryTurns: number;
  secondaryTurns: number;
  coreMaterial: CoreMaterial;
  stepType: string;
}) {
  const W = 500;
  const H = 220;
  const coreColor = coreMaterial === "air" ? "#3A4B48" : coreMaterial === "iron" ? "#5C726C" : "#7A8F8A";
  const pTurnsVisual = Math.min(8, Math.max(3, Math.round(primaryTurns / 150)));
  const sTurnsVisual = Math.min(10, Math.max(3, Math.round(secondaryTurns / 250)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Transformer diagram">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      {/* iron core */}
      <rect x={220} y={30} width={60} height={160} fill={coreColor} opacity={0.35} stroke={coreColor} strokeWidth={2} />
      <text x={225} y={22} fontSize="9" fill="#8FA39D">
        {coreMaterial} core
      </text>

      {/* primary coil */}
      {Array.from({ length: pTurnsVisual }).map((_, i) => (
        <ellipse key={i} cx={210} cy={50 + (i * 140) / (pTurnsVisual - 1 || 1)} rx={22} ry={8} fill="none" stroke="#E85A4A" strokeWidth={2} />
      ))}
      <text x={150} y={20} fontSize="10" fill="#E85A4A">
        Primary (N_p={primaryTurns})
      </text>

      {/* secondary coil */}
      {Array.from({ length: sTurnsVisual }).map((_, i) => (
        <ellipse key={i} cx={290} cy={50 + (i * 140) / (sTurnsVisual - 1 || 1)} rx={22} ry={8} fill="none" stroke="#4A90E2" strokeWidth={2} />
      ))}
      <text x={310} y={20} fontSize="10" fill="#4A90E2">
        Secondary (N_s={secondaryTurns})
      </text>

      <text x={180} y={205} fontSize="11" fill="#8FA39D">
        {stepType}
      </text>
    </svg>
  );
}
