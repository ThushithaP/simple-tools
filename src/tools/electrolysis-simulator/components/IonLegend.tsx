import { Electrolyte } from "../types";
import { ionSpecies } from "./ionSpecies";

export default function IonLegend({ electrolyte }: { electrolyte: Electrolyte }) {
  const species = ionSpecies(electrolyte);

  return (
    <div className="w-full max-w-[180px] shrink-0 rounded border border-[#2A3A37] bg-[#121A18] p-3">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-[#8FA39D]">Ion key</div>
      <div className="space-y-2.5">
        {species.map((sp) => (
          <div key={sp.symbol} className="flex items-start gap-2">
            <span
              className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: sp.color }}
            />
            <div className="leading-tight">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xs text-[#ECF2F0]">{sp.symbol}</span>
                <span className="font-mono text-[9px] text-[#5C726C]">{sp.color}</span>
              </div>
              <div className={`text-[10px] ${sp.minor ? "text-[#5C726C]" : "text-[#8FA39D]"}`}>{sp.name}</div>
              <div className="text-[10px] text-[#5FC7B8]">→ {sp.toCathode ? "cathode" : "anode"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
