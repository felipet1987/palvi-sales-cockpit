import type { FunnelStep } from '@/domain/analysis'
import { cn } from '@/lib/cn'
import { Card, CardContent } from '@/ui/components/ui/Card'

interface Props {
  steps: FunnelStep[]
  bottleneck: FunnelStep | null
}

const fmt = new Intl.NumberFormat('en-US')

export function Funnel({ steps, bottleneck }: Props) {
  const max = steps.reduce((m, s) => Math.max(m, s.total), 0) || 1

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Embudo · últimos 30 días
          </h2>
          {bottleneck && (
            <span className="text-[11px] text-alert">
              cuello: {bottleneck.label}
            </span>
          )}
        </div>

        <ul className="space-y-2">
          {steps.map((step) => {
            const pct = step.total / max
            const isBottleneck = bottleneck?.key === step.key
            return (
              <li key={step.key} className="grid grid-cols-[80px_1fr_70px_70px] items-center gap-3 text-sm">
                <span className="text-ink-muted">{step.label}</span>
                <div className="h-5 rounded bg-bg-soft border border-border overflow-hidden relative">
                  <div
                    className={cn(
                      'h-full rounded transition-all',
                      isBottleneck ? 'bg-alert/60' : 'bg-accent/55',
                    )}
                    style={{ width: `${Math.max(pct * 100, 1)}%` }}
                  />
                </div>
                <span className="num text-right font-medium text-ink">{fmt.format(step.total)}</span>
                <span className={cn(
                  'num text-right text-xs',
                  step.conversionFromPrev == null
                    ? 'text-ink-faint'
                    : isBottleneck ? 'text-alert' : 'text-ink-muted',
                )}>
                  {step.conversionFromPrev == null
                    ? '—'
                    : `${(step.conversionFromPrev * 100).toFixed(1)}%`}
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
