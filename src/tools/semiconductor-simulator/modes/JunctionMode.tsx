import { useMemo, useState } from "react";
import { Material } from "../types";
import { junctionElectrostatics } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import BandBendingDiagram from "../components/BandBendingDiagram";
import FullscreenPanel from "../../../components/FullscreenPanel";

const CANVAS_W = 720;
const CANVAS_H = 280;

function currentBalanceLabel(biasV: number): string {
  if (Math.abs(biasV) < 0.05) return "Equilibrium: diffusion current = drift current → net current = 0";
  if (biasV > 0) return "Forward bias: diffusion current dominates → significant net current flows";
  return "Reverse bias: drift current dominates → only tiny saturation current (Iₛ) flows";
}

export default function JunctionMode() {
  const [material, setMaterial] = useState<Material>("silicon");
  const [tempK, setTempK] = useState(300);
  const [naExp, setNaExp] = useState(16);
  const [ndExp, setNdExp] = useState(16);
  const [biasV, setBiasV] = useState(0);

  const naCm3 = Math.pow(10, naExp);
  const ndCm3 = Math.pow(10, ndExp);
  const result = useMemo(() => junctionElectrostatics(material, tempK, naCm3, ndCm3, biasV), [material, tempK, naCm3, ndCm3, biasV]);

  // visual width: scale depletion width (um) into pixels, clamped for legibility
  const maxDepletionPx = 220;
  const depletionPx = Math.max(10, Math.min(maxDepletionPx, result.depletionWidthUm * 260));
  const midX = CANVAS_W / 2;
  const depLeft = midX - depletionPx * result.depletionOnPside;
  const depRight = midX + depletionPx * result.depletionOnNside;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Material"
          value={material}
          onChange={setMaterial}
          options={[
            { value: "silicon", label: "Silicon" },
            { value: "germanium", label: "Germanium" },
          ]}
        />
        <SliderField label="p-side doping (Nₐ)" unit=" (10ˣ cm⁻³)" min={15} max={18} step={0.1} value={naExp} onChange={setNaExp} />
        <SliderField label="n-side doping (N_D)" unit=" (10ˣ cm⁻³)" min={15} max={18} step={0.1} value={ndExp} onChange={setNdExp} />
        <SliderField label="Temperature" unit=" K" min={200} max={400} step={5} value={tempK} onChange={setTempK} />
        <SliderField label="Bias voltage" unit=" V" min={-5} max={5} step={0.05} value={biasV} onChange={setBiasV} />

        <EquationBox
          lines={[
            `V_bi = V_T ln(NₐN_D/nᵢ²) = ${result.builtInPotentialV.toFixed(3)} V`,
            `W = √[(2εₛ/q)(1/Nₐ+1/N_D)(V_bi−V)]`,
            `W = ${result.depletionWidthUm.toFixed(3)} μm`,
          ]}
        />
        <MisconceptionTip
          wrong="The depletion region has no charge."
          right="It has no free carriers, but it does have fixed charge: positive donor ions (n-side) and negative acceptor ions (p-side)."
        />
      </div>

      <div className="space-y-6">
        <FullscreenPanel>
          <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width="100%" height="auto" role="img" aria-label="p-n junction diagram">
            <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#0D1412" />
            {/* p-side */}
            <rect x={0} y={40} width={depLeft} height={160} fill="#E85A4A22" stroke="#E85A4A" strokeWidth={1} />
            {/* n-side */}
            <rect x={depRight} y={40} width={CANVAS_W - depRight} height={160} fill="#4A90E222" stroke="#4A90E2" strokeWidth={1} />
            {/* depletion region */}
            <rect x={depLeft} y={40} width={depRight - depLeft} height={160} fill="#E8A33D22" stroke="#E8A33D" strokeWidth={1} strokeDasharray="4 3" />

            {/* fixed ions near junction edges */}
            {Array.from({ length: 6 }).map((_, i) => (
              <text key={`ion-p-${i}`} x={depLeft - 14 - i * 16} y={60 + (i % 3) * 40} fontSize="11" fill="#E85A4A">
                −
              </text>
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <text key={`ion-n-${i}`} x={depRight + 6 + i * 16} y={60 + (i % 3) * 40} fontSize="11" fill="#4A90E2">
                +
              </text>
            ))}

            {/* field arrows, n -> p */}
            {Array.from({ length: 3 }).map((_, i) => {
              const y = 90 + i * 40;
              return (
                <g key={`field-${i}`}>
                  <line x1={depRight - 6} y1={y} x2={depLeft + 6} y2={y} stroke="#E8A33D" strokeWidth={1.4} markerEnd="url(#arrow)" />
                </g>
              );
            })}
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#E8A33D" />
              </marker>
            </defs>

            <text x={depLeft / 2 - 16} y={30} fontSize="12" fill="#E85A4A">
              p-type
            </text>
            <text x={(CANVAS_W + depRight) / 2 - 16} y={30} fontSize="12" fill="#4A90E2">
              n-type
            </text>
            <text x={midX - 40} y={220} fontSize="10" fill="#E8A33D">
              depletion region
            </text>
            <text x={midX - 14} y={235} fontSize="9" fill="#5C726C">
              W = {result.depletionWidthUm.toFixed(3)} μm
            </text>
          </svg>
        </FullscreenPanel>

        {/* simplified band diagram with bending */}
        <FullscreenPanel>
          <div className="mb-2 text-[11px] uppercase tracking-wide text-[#8FA39D]">Energy Band Diagram (across junction)</div>
          <BandBendingDiagram builtInV={result.builtInPotentialV} biasV={biasV} />
        </FullscreenPanel>

        <div className="rounded border border-dashed border-[#3A4B48] p-3 text-xs text-[#8FA39D]">{currentBalanceLabel(biasV)}</div>

        <StatGrid
          stats={[
            { label: "Built-in potential", value: `${result.builtInPotentialV.toFixed(3)} V` },
            { label: "Depletion width", value: `${result.depletionWidthUm.toFixed(3)} μm` },
            { label: "Barrier height", value: `${result.builtInPotentialV.toFixed(3)} eV` },
            { label: "Max field", value: `${result.maxFieldVPerCm.toExponential(2)} V/cm` },
            { label: "Bias", value: `${biasV.toFixed(2)} V` },
            { label: "Net current (eq.)", value: Math.abs(biasV) < 0.05 ? "0 (balanced)" : biasV > 0 ? "Forward → flows" : "≈ Iₛ (leakage)" },
          ]}
        />
      </div>
    </div>
  );
}


