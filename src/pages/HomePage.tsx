import { TOOLS } from '../tools/registry'
import { ToolCard } from '../components/ToolCard'

export function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-12">
      <header className="mb-8 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Tools</h1>
        <p className="text-sm text-slate-400">Small, focused calculators — pick one to get started.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  )
}
