import { Link } from './Link'
import type { ToolMeta } from '../tools/registry'

export function ToolCard({ tool }: { tool: ToolMeta }) {
  return (
    <Link
      to={tool.path}
      className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-emerald-400/30 hover:bg-white/[0.05]"
    >
      <span className="text-2xl">{tool.icon}</span>
      <h2 className="font-semibold text-white transition group-hover:text-emerald-300">{tool.title}</h2>
      <p className="text-sm text-slate-400">{tool.description}</p>
    </Link>
  )
}
