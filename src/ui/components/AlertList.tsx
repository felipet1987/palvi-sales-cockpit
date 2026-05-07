import type { KpiResult } from '@/domain/analysis'
import { Card, CardContent } from '@/ui/components/ui/Card'
import { severityDot, severityLabel } from '@/ui/severity'
import { cn } from '@/lib/cn'

interface Props {
  alerts: KpiResult[]
  /** How many to show. Defaults to 3 — fits "5 minutes before standup". */
  limit?: number
  emptyMessage?: string
}

/** Per-metric copy. The presentation layer owns the wording, not the registry. */
function explain(k: KpiResult): string {
  const { meta, formatted, caption, rawPctChange } = k
  const sign = rawPctChange > 0 ? '+' : rawPctChange < 0 ? '−' : ''
  const pct = (Math.abs(rawPctChange) * 100).toFixed(0)
  const direction = meta.direction === 'lower_is_better' ? 'should go down' : 'should go up'

  switch (meta.key) {
    case 'stale_deals':
      return `${formatted} deals open >60 days (${sign}${pct}% vs prior week). Push these to close or kill them.`
    case 'avg_response_time_min':
      return `Sales takes ${formatted} ${caption} to first-touch leads (${sign}${pct}%). Slow response kills B2B conversion.`
    case 'avg_deal_cycle_days':
      return `Deals taking ${formatted} days to close (${sign}${pct}%). Cycle is dragging.`
    case 'deals_lost':
      return `Losing ${formatted} ${caption} (${sign}${pct}%). Review qualification and pricing.`
    case 'deals_won':
      return `Closing ${formatted} ${caption}, ${sign}${pct}% vs prior — wins falling.`
    case 'support_tickets_opened':
      return `${formatted} ${caption} new tickets (${sign}${pct}%). Volume spike may pull capacity.`
    default:
      return `${meta.label} at ${formatted} ${caption} (${sign}${pct}% vs prior, ${direction}).`
  }
}

export function AlertList({
  alerts,
  limit = 3,
  emptyMessage = 'Sin alertas — pipeline sano. Sigue así.',
}: Props) {
  const visible = alerts.slice(0, limit)

  return (
    <Card className="bg-gradient-to-br from-bg-card to-bg-soft">
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Tu foco hoy
          </h2>
          <span className="text-[11px] text-ink-faint">
            ranked by severity · last 7d vs prior 7d
          </span>
        </div>

        {visible.length === 0 ? (
          <p className="py-4 text-sm text-ok">{emptyMessage}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {visible.map((k) => (
              <li key={k.meta.key} className="flex items-start gap-3 py-3 first:pt-1 last:pb-1">
                <span
                  className={cn(
                    'mt-1.5 inline-block size-2.5 rounded-full shrink-0',
                    severityDot[k.severity],
                  )}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                      {severityLabel[k.severity]}
                    </span>
                    <span className="text-sm font-medium text-ink">{k.meta.label}</span>
                  </div>
                  <p className="text-sm text-ink-muted mt-0.5">{explain(k)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
