import { useState } from "react";
import TemperatureHeatBasicsMode from "./modes/TemperatureHeatBasicsMode";
import ConductionMode from "./modes/ConductionMode";
import ConvectionMode from "./modes/ConvectionMode";
import RadiationMode from "./modes/RadiationMode";
import SpecificHeatMode from "./modes/SpecificHeatMode";
import PhaseChangeMode from "./modes/PhaseChangeMode";

type Mode = "basics" | "conduction" | "convection" | "radiation" | "specific-heat" | "phase-change";

const TABS: { id: Mode; label: string; description: string }[] = [
  { id: "basics", label: "Temperature & Heat", description: "Particle model, thermal equilibrium, temperature vs heat energy." },
  { id: "conduction", label: "Conduction", description: "Real transient heat conduction through a rod — Fourier's Law." },
  { id: "convection", label: "Convection", description: "Natural vs forced fluid circulation, Newton's Law of Cooling." },
  { id: "radiation", label: "Radiation", description: "Stefan-Boltzmann Law, emissivity, net radiative exchange." },
  { id: "specific-heat", label: "Specific Heat", description: "Q = mcΔT — why water heats slower than metals." },
  { id: "phase-change", label: "Phase Changes", description: "Full heating/cooling curve, latent heat, molecular view." },
];

export default function HeatTransferSimulator() {
  const [mode, setMode] = useState<Mode>("basics");
  const active = TABS.find((t) => t.id === mode)!;

  return (
    <div className="min-h-full bg-[#0F1614] text-[#ECF2F0] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Heat Transfer &amp; Phase Changes</h1>
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

        {mode === "basics" && <TemperatureHeatBasicsMode />}
        {mode === "conduction" && <ConductionMode />}
        {mode === "convection" && <ConvectionMode />}
        {mode === "radiation" && <RadiationMode />}
        {mode === "specific-heat" && <SpecificHeatMode />}
        {mode === "phase-change" && <PhaseChangeMode />}
      </div>
    </div>
  );
}
