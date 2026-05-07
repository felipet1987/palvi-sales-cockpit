import { datasets } from '@/data/loader'
import { DatasetSwitcher } from '@/ui/components/DatasetSwitcher'
import { Dashboard } from '@/ui/Dashboard'
import { useDatasetParam } from '@/ui/useDatasetParam'

export default function App() {
  const [datasetId, setDatasetId] = useDatasetParam()
  const dataset = datasets[datasetId]

  return (
    <div className="min-h-full">
      <header className="border-b border-border bg-bg-soft/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="size-7 rounded-lg bg-accent/20 border border-accent/40 grid place-content-center">
              <span className="text-accent text-sm font-bold">P</span>
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Palvi · Sales Cockpit</h1>
              <p className="text-xs text-ink-faint">Reporte ejecutivo diario</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-faint hidden sm:inline">Dataset</span>
            <DatasetSwitcher value={datasetId} onChange={setDatasetId} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Dashboard key={datasetId} dataset={dataset} />
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-8 text-xs text-ink-faint">
        <p>
          Severity ranking, sparklines and funnel are computed from the same metric registry —
          see <span className="font-mono text-ink-muted">src/domain/metric-registry.ts</span>.
        </p>
      </footer>
    </div>
  )
}
