import { ReactionResult } from "../types";

export default function ReactionDisplay({ reaction }: { reaction: ReactionResult }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3">
        <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Cathode (-)</div>
        <div className="mt-1 font-mono text-xs text-[#ECF2F0] break-words">{reaction.cathodeEquation}</div>
        <div className="mt-1 text-[11px] text-[#5FC7B8]">{reaction.cathodeLabel}</div>
      </div>
      <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3">
        <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Anode (+)</div>
        <div className="mt-1 font-mono text-xs text-[#ECF2F0] break-words">{reaction.anodeEquation}</div>
        <div className="mt-1 text-[11px] text-[#5FC7B8]">{reaction.anodeLabel}</div>
      </div>
      {reaction.note && (
        <div className="col-span-2 rounded border border-dashed border-[#3A4B48] p-2 text-[11px] text-[#8FA39D]">
          {reaction.note}
        </div>
      )}
    </div>
  );
}
