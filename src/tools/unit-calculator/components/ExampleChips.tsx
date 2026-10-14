const EXAMPLES = [
  '15 psi + 2.3 bar',
  '(3.2 kg * 9.81 m/s^2) / 25 cm^2',
  '0.5 M * 2 L',
  '10 g / (58.44 g/mol)',
  '12 g / 400 mL',
  '98.6 degF to degC',
  '60 mph to km/h',
  '1800 rpm to rad/s',
  '5 gpm to L/minute',
  '2.5 mol/L * 0.150 L',
]

export function ExampleChips({ onPick }: { onPick: (expr: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLES.map((ex) => (
        <button
          key={ex}
          onClick={() => onPick(ex)}
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-slate-200"
        >
          {ex}
        </button>
      ))}
    </div>
  )
}
