import { TOOLS } from '../tools/registry'
import { ToolCard } from '../components/ToolCard'

const AUTHOR_NAME = 'Thushitha Senarath'
const AUTHOR_URL = 'https://your-website.com'

export function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-12">
      <header className="mb-8 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Science Tools</h1>
        <p className="text-sm text-slate-400">
          Interactive simulators and calculators for chemistry, physics and maths. Pick one to get started.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      <footer className="mt-12 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()}{' '}
        <a
          // href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          {AUTHOR_NAME}
        </a>
        . All rights reserved.
      </footer>
    </div>
  )
}