import { useState } from "react";
import { SemiMode } from "./types";
import SemiconductorBasicsMode from "./modes/SemiconductorBasicsMode";
import JunctionMode from "./modes/JunctionMode";
import DiodeIVMode from "./modes/DiodeIVMode";
import RectificationMode from "./modes/RectificationMode";
import TransistorMode from "./modes/TransistorMode";

const TABS: { id: SemiMode; label: string; description: string }[] = [
  { id: "basics", label: "Semiconductor Basics", description: "Band theory, doping, and the mass action law." },
  { id: "junction", label: "p-n Junction", description: "Depletion region, built-in potential, band bending." },
  { id: "diode-iv", label: "Diode I-V", description: "Shockley equation, forward/reverse bias, real-time sweep." },
  { id: "rectification", label: "Rectification", description: "Half-wave, full-wave bridge, and capacitor filtering." },
  { id: "transistor", label: "Transistors", description: "NPN/PNP as a switch or a common-emitter amplifier." },
];

export default function SemiconductorSimulator() {
  const [mode, setMode] = useState<SemiMode>("basics");
  const active = TABS.find((t) => t.id === mode)!;

  return (
    <div className="min-h-full bg-[#0F1614] text-[#ECF2F0] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">p-n Junctions, Diodes &amp; Transistors</h1>
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

        {mode === "basics" && <SemiconductorBasicsMode />}
        {mode === "junction" && <JunctionMode />}
        {mode === "diode-iv" && <DiodeIVMode />}
        {mode === "rectification" && <RectificationMode />}
        {mode === "transistor" && <TransistorMode />}
      </div>
    </div>
  );
}
