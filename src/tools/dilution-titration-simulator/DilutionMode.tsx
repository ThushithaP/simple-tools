import { useMemo, useState } from "react";
import Beaker from "./components/Beaker";
import { DilutionStep, formatNumber, resolveDilutionChain } from "./chemistry";
import FullscreenPanel from "../../components/FullscreenPanel";

const TEAL_RGB = "95, 199, 184";

let stepIdCounter = 0;
function nextStepId() {
  stepIdCounter += 1;
  return `step-${stepIdCounter}`;
}

export default function DilutionMode() {
  const [stockConc, setStockConc] = useState(1.0);
  const [steps, setSteps] = useState<DilutionStep[]>([{ id: nextStepId(), c1: 1.0, v1: 10, v2: 100 }]);

  const resolved = useMemo(() => resolveDilutionChain(stockConc, steps), [stockConc, steps]);
  const finalConc = resolved.length ? resolved[resolved.length - 1].c2 : stockConc;

  function updateStep(id: string, patch: Partial<DilutionStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addStep() {
    const last = resolved[resolved.length - 1];
    const carriedConc = last ? last.c2 : stockConc;
    setSteps((prev) => [...prev, { id: nextStepId(), c1: carriedConc, v1: 10, v2: 100 }]);
  }

  function removeStep(id: string) {
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
      {/* Controls */}
      <div className="space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wide text-[#8FA39D] mb-1">
            Stock concentration (C₁, mol/L)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={stockConc}
            onChange={(e) => setStockConc(Math.max(0, Number(e.target.value)))}
            className="w-full rounded border border-[#2A3A37] bg-[#0F1614] px-3 py-2 font-mono text-sm text-[#ECF2F0] focus:border-[#5FC7B8] focus:outline-none"
          />
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => {
            const stepResolved = resolved[idx];
            return (
              <div key={step.id} className="rounded border border-[#2A3A37] bg-[#121A18] p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-[#8FA39D]">Step {idx + 1}</span>
                  {steps.length > 1 && (
                    <button
                      onClick={() => removeStep(step.id)}
                      className="text-xs text-[#8FA39D] hover:text-[#E8A33D] transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#8FA39D] mb-1">Aliquot taken V₁ (mL)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={step.v1}
                      onChange={(e) => updateStep(step.id, { v1: Math.max(0, Number(e.target.value)) })}
                      className="w-full rounded border border-[#2A3A37] bg-[#0F1614] px-2 py-1.5 font-mono text-sm text-[#ECF2F0] focus:border-[#5FC7B8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#8FA39D] mb-1">Final volume V₂ (mL)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.01"
                      value={step.v2}
                      onChange={(e) => updateStep(step.id, { v2: Math.max(0.01, Number(e.target.value)) })}
                      className="w-full rounded border border-[#2A3A37] bg-[#0F1614] px-2 py-1.5 font-mono text-sm text-[#ECF2F0] focus:border-[#5FC7B8] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="font-mono text-xs text-[#5FC7B8]">
                  {formatNumber(stepResolved.c1, 4)} × {formatNumber(step.v1, 2)} = C₂ × {formatNumber(step.v2, 2)}
                  {"  →  C₂ = "}
                  {formatNumber(stepResolved.c2, 4)} mol/L
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={addStep}
          className="w-full rounded border border-dashed border-[#3A4B48] py-2 text-sm text-[#8FA39D] hover:border-[#5FC7B8] hover:text-[#5FC7B8] transition-colors"
        >
          + Add dilution step
        </button>
      </div>

      {/* Visual */}
      <FullscreenPanel fit="height" fitHeight="38dvh" cardClassName="rounded border border-[#2A3A37] bg-[#0D1412] p-8" contentClassName="flex flex-col items-center justify-center gap-6">
        <div className="flex flex-wrap items-end justify-center gap-6">
          <Beaker
            fillRatio={1}
            intensity={1}
            colorRgb={TEAL_RGB}
            label="Stock"
            volumeLabel={`${formatNumber(steps[0]?.v1 ?? 0, 1)} mL`}
            concLabel={`${formatNumber(stockConc, 4)} mol/L`}
          />
          <div className="pb-16 text-2xl text-[#3A4B48]">→</div>
          {resolved.map((r, idx) => (
            <Beaker
              key={r.id}
              fillRatio={1}
              intensity={Math.max(0.06, r.c2 / Math.max(stockConc, 1e-9))}
              colorRgb={TEAL_RGB}
              label={idx === resolved.length - 1 ? "Final" : `After step ${idx + 1}`}
              volumeLabel={`${formatNumber(r.v2, 1)} mL`}
              concLabel={`${formatNumber(r.c2, 4)} mol/L`}
            />
          ))}
        </div>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-[#8FA39D]">Result</div>
          <div className="font-mono text-2xl text-[#ECF2F0]">{formatNumber(finalConc, 5)} mol/L</div>
          <div className="text-xs text-[#5C726C]">
            {formatNumber(stockConc / Math.max(finalConc, 1e-12), 1)}× dilution from stock
          </div>
        </div>
      </FullscreenPanel>
    </div>
  );
}
