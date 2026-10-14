import { useState } from "react";
import ShapeExplorerMode from "./modes/ShapeExplorerMode";
import UnitCubesMode from "./modes/UnitCubesMode";

type Mode = "explorer" | "unit-cubes";

const TABS: { id: Mode; label: string; description: string }[] = [
  { id: "explorer", label: "Shape Explorer", description: "Create, inspect, rotate, and recolor 3D shapes." },
  { id: "unit-cubes", label: "Unit Cube Builder", description: "Can these unit cubes make a perfect cube?" },
];

export default function Shapes3DSimulator() {
  const [mode, setMode] = useState<Mode>("explorer");
  const active = TABS.find((t) => t.id === mode)!;

  return (
    <div className="min-h-full bg-[#0F1614] text-[#ECF2F0] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">3D Shapes Classroom</h1>
          <p className="text-sm text-[#8FA39D]">{active.description}</p>
        </header>

        <div className="flex flex-wrap rounded border border-[#2A3A37] overflow-hidden text-sm" role="tablist" aria-label="Activity">
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

        {mode === "explorer" && <ShapeExplorerMode />}
        {mode === "unit-cubes" && <UnitCubesMode />}
      </div>
    </div>
  );
}
