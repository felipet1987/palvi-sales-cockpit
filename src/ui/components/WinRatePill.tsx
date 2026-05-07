import type { Severity } from '@/data/types'
import { cn } from '@/lib/cn'
import { severityBg } from '@/ui/severity'

interface Props {
  current: number
  prior: number
  severity: Severity
  rawPctChange: number
}

export function WinRatePill({ current, prior, severity, rawPctChange }: Props) {
  const pct = (current * 100).toFixed(1)
  const priorPct = (prior * 100).toFixed(1)
  const arrow = rawPctChange === 0 ? '→' : rawPctChange > 0 ? '▲' : '▼'
  return (
    <div className={cn(
      'inline-flex items-center gap-3 rounded-full border px-3 py-1 text-xs',
      severityBg[severity],
    )}>
      <span className="font-semibold">Win rate</span>
      <span className="num font-mono text-sm">{pct}%</span>
      <span className="text-ink-muted text-[11px]">
        {arrow} from {priorPct}%
      </span>
    </div>
  )
}
