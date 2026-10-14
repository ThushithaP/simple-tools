import type { ReactNode } from 'react'
import { Link } from './Link'
import { useRouter } from '../lib/router'

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useRouter()

  return (
    <>
      <header className="border-b border-white/5 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-white transition hover:text-emerald-300">
            🧰 Simple Tools
          </Link>
          {path !== '/' && (
            <Link to="/" className="text-xs text-slate-400 transition hover:text-slate-200">
              ← All tools
            </Link>
          )}
        </div>
      </header>
      {children}
    </>
  )
}
