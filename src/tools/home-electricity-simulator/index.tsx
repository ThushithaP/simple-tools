import { useState } from "react";
import BasicCircuitMode from "./modes/BasicCircuitMode";
import HouseholdWiringMode from "./modes/HouseholdWiringMode";
import SafetyDevicesMode from "./modes/SafetyDevicesMode";
import PowerEnergyMode from "./modes/PowerEnergyMode";
import EfficiencyMode from "./modes/EfficiencyMode";
import FaultDiagnosisMode from "./modes/FaultDiagnosisMode";

type Mode = "basic" | "wiring" | "safety" | "power" | "efficiency" | "fault";

const TABS: { id: Mode; label: string; description: string }[] = [
  { id: "basic", label: "Basic Circuits", description: "Series vs parallel: why homes use parallel wiring." },
  { id: "wiring", label: "House Wiring", description: "Consumer unit, circuits, wire colors, parallel connection." },
  { id: "safety", label: "Safety Devices", description: "Fuses, MCBs, RCDs, and earthing." },
  { id: "power", label: "Power & Energy", description: "Instantaneous power, kWh, and electricity cost." },
  { id: "efficiency", label: "Efficiency", description: "Energy in vs useful output, savings, payback period." },
  { id: "fault", label: "Fault Diagnosis", description: "Multimeter tool and a fault-finding challenge." },
];

export default function HomeElectricitySimulator() {
  const [mode, setMode] = useState<Mode>("basic");
  const active = TABS.find((t) => t.id === mode)!;

  return (
    <div className="min-h-full bg-[#0F1614] text-[#ECF2F0] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Home Electric Circuits &amp; Safety</h1>
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

        {mode === "basic" && <BasicCircuitMode />}
        {mode === "wiring" && <HouseholdWiringMode />}
        {mode === "safety" && <SafetyDevicesMode />}
        {mode === "power" && <PowerEnergyMode />}
        {mode === "efficiency" && <EfficiencyMode />}
        {mode === "fault" && <FaultDiagnosisMode />}
      </div>
    </div>
  );
}
