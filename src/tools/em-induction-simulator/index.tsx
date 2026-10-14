import { useState } from "react";
import FaradayBasicsMode from "./modes/FaradayBasicsMode";
import FactorsMode from "./modes/FactorsMode";
import LenzLawMode from "./modes/LenzLawMode";
import AcGeneratorMode from "./modes/AcGeneratorMode";
import DcGeneratorMotorMode from "./modes/DcGeneratorMotorMode";
import TransformerMode from "./modes/TransformerMode";

type Mode = "faraday" | "factors" | "lenz" | "ac-generator" | "dc" | "transformer";

const TABS: { id: Mode; label: string; description: string }[] = [
  { id: "faraday", label: "Faraday's Law", description: "Moving magnet and coil — motion induces EMF." },
  { id: "factors", label: "Factors", description: "Speed, strength, turns, area, angle — what changes EMF." },
  { id: "lenz", label: "Lenz's Law", description: "Direction of induced current, poles, and force." },
  { id: "ac-generator", label: "AC Generator", description: "Rotating coil, slip rings, sinusoidal output." },
  { id: "dc", label: "DC Generator/Motor", description: "Commutator: pulsating DC, or motor back-EMF." },
  { id: "transformer", label: "Transformers", description: "Mutual induction, turns ratio, step-up/down." },
];

export default function EmInductionSimulator() {
  const [mode, setMode] = useState<Mode>("faraday");
  const active = TABS.find((t) => t.id === mode)!;

  return (
    <div className="min-h-full bg-[#0F1614] text-[#ECF2F0] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Electromagnetic Induction</h1>
          <p className="text-sm text-[#8FA39D]">{active.description}</p>
        </header>

        <div className="flex flex-wrap rounded border border-[#2A3A37] overflow-hidden text-sm" role="tablist" aria-label="Simulation mode">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => setMode(t.id)}
              className={`px-4 py-2.5 min-h-[44px] transition-colors ${
                mode === t.id ? "bg-[#5FC7B8] text-[#0D1412]" : "bg-[#121A18] text-[#8FA39D]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "faraday" && <FaradayBasicsMode />}
        {mode === "factors" && <FactorsMode />}
        {mode === "lenz" && <LenzLawMode />}
        {mode === "ac-generator" && <AcGeneratorMode />}
        {mode === "dc" && <DcGeneratorMotorMode />}
        {mode === "transformer" && <TransformerMode />}
      </div>
    </div>
  );
}
