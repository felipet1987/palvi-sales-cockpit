import type { KpiResult } from '@/domain/analysis'
import { cn } from '@/lib/cn'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/Card'
import { Badge } from '@/ui/components/ui/Badge'
import { Sparkline } from '@/ui/components/Sparkline'

interface Props {
  kpi: KpiResult
}

export function KpiCard({ kpi }: Props) {
  const { meta, formatted, caption, severity, pctChange, rawPctChange, series30d, hint } = kpi

  // Direction-aware delta rendering. The arrow follows raw movement; the
  // color follows whether the move is good (signed pctChange).
  const arrow = rawPctChange === 0 ? '→' : rawPctChange > 0 ? '▲' : '▼'
  const isGood = pctChange >= 0
  const deltaColor = pctChange === 0
    ? 'text-ink-faint'
    : isGood ? 'text-ok' : 'text-alert'

  const pct = (Math.abs(rawPctChange) * 100).toFixed(1)
  const sign = rawPctChange > 0 ? '+' : rawPctChange < 0 ? '−' : ''

  return (
    <Card className={cn(
      'transition-shadow',
      severity !== 'ok' && 'ring-1',
      severity === 'watch' && 'ring-watch/30',
      severity === 'alert' && 'ring-alert/40',
      severity === 'crit' && 'ring-crit/60',
    )}>
      <CardHeader>
        <div>
          <CardTitle>{meta.label}</CardTitle>
          <p className="text-[11px] text-ink-faint mt-0.5 leading-tight">{hint}</p>
        </div>
        {severity !== 'ok' && <Badge severity={severity} />}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-1.5">
          <span className="num text-2xl font-semibold tracking-tight text-ink">{formatted}</span>
          <span className="text-xs text-ink-faint">{caption}</span>
        </div>
        <Sparkline data={series30d} severity={severity} />
        <div className="flex items-center justify-between text-xs pt-1">
          <span className={cn('num font-medium', deltaColor)}>
            {arrow} {sign}{pct}%
          </span>
          <span className="text-ink-faint">vs prior 7d</span>
        </div>
      </CardContent>
    </Card>
  )
}
