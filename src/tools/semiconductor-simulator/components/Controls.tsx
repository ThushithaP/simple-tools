const labelClass = "text-[11px] text-[#8FA39D]";
const selectClass =
  "w-full rounded border border-[#2A3A37] bg-[#0F1614] px-2 py-1.5 text-sm text-[#ECF2F0] focus:border-[#5FC7B8] focus:outline-none";

export function SliderField({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  logScale,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  logScale?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className={labelClass}>{label}</label>
        <span className="font-mono text-xs text-[#ECF2F0]">
          {logScale ? value.toExponential(1) : value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#5FC7B8]"
        aria-label={label}
      />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <label className={`${labelClass} mb-1 block`}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={selectClass} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SegmentedField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <label className={`${labelClass} mb-1 block`}>{label}</label>
      <div className="flex rounded border border-[#2A3A37] overflow-hidden text-xs">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 py-1.5 min-h-[44px] transition-colors ${
              value === o.value ? "bg-[#5FC7B8] text-[#0D1412]" : "bg-[#0F1614] text-[#8FA39D]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StatGrid({ stats }: { stats: { label: string; value: string; muted?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded border border-[#2A3A37] bg-[#121A18] p-3 text-center">
          <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">{s.label}</div>
          <div className={`font-mono text-sm ${s.muted ? "text-[#5C726C]" : "text-[#ECF2F0]"}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export function EquationBox({ lines }: { lines: string[] }) {
  return (
    <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-[#8FA39D] mb-1">Equations</div>
      {lines.map((l, i) => (
        <div key={i} className="font-mono text-xs text-[#5FC7B8] break-words">
          {l}
        </div>
      ))}
    </div>
  );
}

export function MisconceptionTip({ wrong, right }: { wrong: string; right: string }) {
  return (
    <div className="rounded border border-dashed border-[#3A4B48] p-3 text-xs space-y-1">
      <div className="text-[#E8A33D]">✗ {wrong}</div>
      <div className="text-[#5FC7B8]">✓ {right}</div>
    </div>
  );
}

export function PlaybackControls({
  running,
  onToggleRunning,
  onReset,
  speed,
  onSpeedChange,
}: {
  running: boolean;
  onToggleRunning: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (v: number) => void;
}) {
  const speeds = [0.25, 0.5, 1, 2];
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={onToggleRunning}
        className="rounded border border-[#2A3A37] bg-[#17211F] px-3 py-1.5 text-sm text-[#ECF2F0] hover:border-[#5FC7B8] transition-colors min-w-[44px] min-h-[44px]"
      >
        {running ? "⏸ Pause" : "▶ Start"}
      </button>
      <button
        onClick={onReset}
        className="rounded border border-[#2A3A37] bg-[#17211F] px-3 py-1.5 text-sm text-[#8FA39D] hover:border-[#E8A33D] hover:text-[#E8A33D] transition-colors min-w-[44px] min-h-[44px]"
      >
        🔄 Reset
      </button>
      <div className="flex rounded border border-[#2A3A37] overflow-hidden text-xs">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2.5 py-1.5 min-h-[44px] transition-colors ${
              speed === s ? "bg-[#5FC7B8] text-[#0D1412]" : "bg-[#0F1614] text-[#8FA39D]"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
