import { useState } from 'react'
import type { EvalResult } from '../lib/calculator'
import type { Step } from '../lib/steps'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // clipboard API unavailable - fail silently, button just won't confirm
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10 active:scale-95"
    >
      {copied ? 'Copied ✓' : label}
    </button>
  )
}

function StepsTrace({ steps }: { steps: Step[] }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:p-4">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        How this was calculated
      </h3>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="break-words font-mono text-xs text-slate-300 sm:text-sm">
            <div>{step.input}</div>
            <div className="pl-2 text-slate-500">↓</div>
            <div className="text-emerald-300">{step.output}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ResultCard({ result, steps }: { result: EvalResult; steps: Step[] }) {
  if (!result.expr.trim()) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-500 sm:p-6">
        Type an expression above — results with units and quick conversions will show up here.
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="break-words rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
        {result.error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <span className="break-words font-mono text-xl font-semibold tracking-tight text-emerald-300 sm:text-2xl">
            {result.primaryFormatted}
          </span>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <CopyButton text={result.excelText} label="Copy → Excel" />
            <CopyButton text={result.latex} label="Copy → LaTeX" />
          </div>
        </div>

        {result.conversions.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-white/10 pt-3">
            {result.conversions.map((c) => (
              <div key={c.unit} className="break-words font-mono text-sm text-slate-400">
                = {c.formatted}
              </div>
            ))}
          </div>
        )}
      </div>

      {steps.length > 0 && <StepsTrace steps={steps} />}
    </div>
  )
}
