import { useState } from "react";
import DilutionMode from "./DilutionMode";
import TitrationMode from "./TitrationMode";
import { SimulatorMode } from "./types";

export default function DilutionTitrationSimulator() {
  const [mode, setMode] = useState<SimulatorMode>("dilution");

  return (
    <div className="min-h-full bg-[#0F1614] text-[#ECF2F0] px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Dilution &amp; Titration Simulator</h1>
          <p className="text-sm text-[#8FA39D]">
            Model serial dilutions and strong acid/base titrations with live pH and indicator color.
          </p>
        </header>

        <div className="inline-flex rounded border border-[#2A3A37] overflow-hidden text-sm">
          <button
            onClick={() => setMode("dilution")}
            className={`px-4 py-2 transition-colors ${
              mode === "dilution" ? "bg-[#5FC7B8] text-[#0D1412]" : "bg-[#121A18] text-[#8FA39D]"
            }`}
          >
            Dilution
          </button>
          <button
            onClick={() => setMode("titration")}
            className={`px-4 py-2 transition-colors ${
              mode === "titration" ? "bg-[#5FC7B8] text-[#0D1412]" : "bg-[#121A18] text-[#8FA39D]"
            }`}
          >
            Titration
          </button>
        </div>

        {mode === "dilution" ? <DilutionMode /> : <TitrationMode />}
      </div>
    </div>
  );
}
