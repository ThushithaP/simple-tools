import { ReactionResult } from "../types";

interface DashboardProps {
  currentA: number;
  elapsedS: number;
  massDepositedG: number | null;
  gasVolumeCm3: number | null;
  gasLabel: string | null;
  reaction: ReactionResult;
}

function fmt(n: number, digits = 3): string {
  return n.toFixed(digits);
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Dashboard({ currentA, elapsedS, massDepositedG, gasVolumeCm3, gasLabel, reaction }: DashboardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Current" value={`${fmt(currentA, 2)} A`} />
      <Stat label="Timer" value={formatTime(elapsedS)} />
      {reaction.copperDeposits && massDepositedG !== null ? (
        <Stat label="Cu deposited" value={`${fmt(massDepositedG, 4)} g`} />
      ) : (
        <Stat label="Cu deposited" value="—" muted />
      )}
      {gasVolumeCm3 !== null && gasLabel ? (
        <Stat label={`${gasLabel} volume`} value={`${fmt(gasVolumeCm3, 2)} cm³`} />
      ) : (
        <Stat label="Gas volume" value="—" muted />
      )}
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">{label}</div>
      <div className={`font-mono text-lg ${muted ? "text-[#5C726C]" : "text-[#ECF2F0]"}`}>{value}</div>
    </div>
  );
}
