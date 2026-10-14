import { useState } from "react";
import { SimMode } from "./types";
import StringWaveMode from "./modes/StringWaveMode";
import SoundWaveMode from "./modes/SoundWaveMode";
import InterferenceMode from "./modes/InterferenceMode";
import StandingWaveMode from "./modes/StandingWaveMode";

const TABS: { id: SimMode; label: string; description: string }[] = [
  { id: "string", label: "Wave on a String", description: "Transverse waves, boundary reflection, damping." },
  { id: "sound", label: "Sound Waves", description: "Longitudinal compression/rarefaction, real audio playback." },
  { id: "interference", label: "Interference", description: "Two coherent sources, constructive/destructive zones, beats." },
  { id: "standing", label: "Standing Waves", description: "Harmonics, nodes, antinodes — tune to resonance." },
];

export default function WavesSoundSimulator() {
  const [mode, setMode] = useState<SimMode>("string");
  const active = TABS.find((t) => t.id === mode)!;

  return (
    <div className="min-h-full bg-[#0F1614] text-[#ECF2F0] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Mechanical Waves, EM Waves &amp; Sound</h1>
          <p className="text-sm text-[#8FA39D]">{active.description}</p>
        </header>

        <div
          className="flex flex-wrap rounded border border-[#2A3A37] overflow-hidden text-sm"
          role="tablist"
          aria-label="Simulation mode"
        >
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

        {mode === "string" && <StringWaveMode />}
        {mode === "sound" && <SoundWaveMode />}
        {mode === "interference" && <InterferenceMode />}
        {mode === "standing" && <StandingWaveMode />}
      </div>
    </div>
  );
}
