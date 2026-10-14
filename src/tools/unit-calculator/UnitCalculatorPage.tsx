import { useMemo, useState } from 'react'
import { evaluate } from './lib/calculator'
import { buildSteps } from './lib/steps'
import { useLocalStorageList } from '../../lib/useLocalStorageList'
import { ResultCard } from './components/ResultCard'
import { ExampleChips } from './components/ExampleChips'

export function UnitCalculatorPage() {
  const [expr, setExpr] = useState('')
  const [sig, setSig] = useState(4)
  const { list: history, add: commitToHistory, clear: handleClearHistory } = useLocalStorageList(
    'unit-calc:history',
    20,
  )

  const result = useMemo(() => evaluate(expr, sig), [expr, sig])
  const steps = useMemo(() => (result.ok ? buildSteps(expr, sig) : []), [expr, sig, result.ok])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitToHistory(expr)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-12">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Unit-Aware Smart Calculator
        </h1>
        <p className="text-sm text-slate-400">
          Calculate with units instead of converting one by one. Type expressions like{' '}
          <code className="break-words rounded bg-white/10 px-1 py-0.5 text-slate-200">
            15 psi + 2.3 bar
          </code>
          .
        </p>
      </header>

      <section className="space-y-3">
        <textarea
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="15 psi + 2.3 bar"
          rows={2}
          autoFocus
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-base text-white placeholder:text-slate-600 focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 sm:p-4 sm:text-lg"
        />

        <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <ExampleChips onPick={(ex) => { setExpr(ex); commitToHistory(ex) }} />
          <label className="flex items-center gap-2 sm:shrink-0 sm:pl-4">
            Sig figs
            <input
              type="range"
              min={2}
              max={8}
              value={sig}
              onChange={(e) => setSig(Number(e.target.value))}
              className="accent-emerald-400"
            />
            <span className="w-4 font-mono text-slate-300">{sig}</span>
          </label>
        </div>
      </section>

      <section>
        <ResultCard result={result} steps={steps} />
      </section>

      {history.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Recent</h2>
            <button
              onClick={handleClearHistory}
              className="text-xs text-slate-600 underline-offset-2 hover:text-slate-400 hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h}
                onClick={() => setExpr(h)}
                className="max-w-full truncate rounded-md border border-white/5 bg-white/[0.02] px-3 py-1.5 font-mono text-xs text-slate-400 hover:border-white/15 hover:text-slate-200"
              >
                {h}
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-auto pt-8 text-xs leading-relaxed text-slate-600">
        Powered by mathjs. Supports physics &amp; engineering units (pressure, energy, force, speed,
        temperature, rotational speed, flow rate...) and chemistry units (mol/L, M, ppm, ppb,
        molality, molar mass). History is saved on this device.
      </footer>
    </div>
  )
}
