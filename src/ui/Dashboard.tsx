import { useMemo } from 'react'
import type { Dataset } from '@/data/types'
import { analyze } from '@/domain/analysis'
import { AlertList } from '@/ui/components/AlertList'
import { Funnel } from '@/ui/components/Funnel'
import { KpiCard } from '@/ui/components/KpiCard'
import { WinRatePill } from '@/ui/components/WinRatePill'

interface Props {
  dataset: Dataset
}

export function Dashboard({ dataset }: Props) {
  const analysis = useMemo(() => analyze(dataset, { windowDays: 7 }), [dataset])

  const date = new Date(analysis.anchorDate + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="space-y-0.5">
          <p className="text-xs uppercase tracking-wider text-ink-faint">Reporte ejecutivo</p>
          <p className="text-sm text-ink-muted">
            Anclado a <span className="text-ink">{date}</span> · ventana {analysis.windowDays}d vs {analysis.windowDays}d previos
          </p>
        </div>
        <WinRatePill {...analysis.winRate} />
      </div>

      <AlertList alerts={analysis.alerts} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {analysis.kpis.map((kpi) => (
          <KpiCard key={kpi.meta.key} kpi={kpi} />
        ))}
      </div>

      <Funnel steps={analysis.funnel.steps} bottleneck={analysis.funnel.bottleneck} />
    </div>
  )
}
