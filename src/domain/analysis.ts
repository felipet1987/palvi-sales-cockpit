// ─────────────────────────────────────────────────────────────────────────────
// analysis.ts
//
// Pure functions that turn a Dataset into the numbers the dashboard renders.
// Two windows: current (last N days) and prior (the N before that). Default 7.
// Sales Manager opens this every morning, so weekly windows are the right grain.
// The funnel uses a separate 30-day window because B2B cycle time would make a
// 7-day "won" too sparse to reason about.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Dataset,
  DayPoint,
  Direction,
  MetricKey,
  MetricMeta,
  Severity,
} from '@/data/types'
import { deltaSeverity, getPresentation } from './metric-registry'

const SEV_RANK: Record<Severity, number> = { ok: 0, watch: 1, alert: 2, crit: 3 }

export interface SeriesPoint {
  date: string
  value: number | null
}

export interface KpiResult {
  meta: MetricMeta
  current: number
  prior: number
  /** Signed pct change where positive means good, considering direction. */
  pctChange: number
  /** Raw pct change before direction flip, for arrow rendering. */
  rawPctChange: number
  severity: Severity
  series30d: SeriesPoint[]
  formatted: string
  caption: string
  hint: string
}

export interface FunnelStep {
  key: 'visits' | 'leads' | 'qualified' | 'deals' | 'won'
  label: string
  total: number
  conversionFromPrev: number | null
}

export interface FunnelBundle {
  steps: FunnelStep[]
  bottleneck: FunnelStep | null
}

export interface WinRate {
  current: number
  prior: number
  severity: Severity
  rawPctChange: number
}

export interface AnalysisOptions {
  windowDays?: number
  /** Anchor day. Defaults to last day in dataset. */
  anchorDate?: string
}

export interface AnalysisResult {
  anchorDate: string
  windowDays: number
  kpis: KpiResult[]
  /** KPIs at WATCH or worse, ranked by severity then |pctChange|. */
  alerts: KpiResult[]
  funnel: FunnelBundle
  winRate: WinRate
}

// ── helpers ──────────────────────────────────────────────────────────────────
function valuesFor(days: DayPoint[], key: MetricKey): (number | null)[] {
  return days.map(d => {
    const v = d.metrics[key]
    return v == null ? null : v
  })
}

function pctSigned(current: number, prior: number, direction: Direction): number {
  if (!Number.isFinite(prior) || prior === 0) return 0
  const raw = (current - prior) / Math.abs(prior)
  return direction === 'higher_is_better' ? raw : -raw
}

function rawPct(current: number, prior: number): number {
  if (!Number.isFinite(prior) || prior === 0) return 0
  return (current - prior) / Math.abs(prior)
}

const safeDiv = (n: number, d: number): number => (d > 0 ? n / d : 0)

// ── main ─────────────────────────────────────────────────────────────────────
export function analyze(dataset: Dataset, opts: AnalysisOptions = {}): AnalysisResult {
  const days = dataset.days
  const total = days.length
  const windowDays = opts.windowDays ?? 7
  const anchorIdx = opts.anchorDate
    ? days.findIndex(d => d.date === opts.anchorDate)
    : total - 1
  if (anchorIdx < 0) throw new Error('anchorDate not in dataset')

  const curStart = Math.max(0, anchorIdx - windowDays + 1)
  const curEnd = anchorIdx + 1
  const priorStart = Math.max(0, curStart - windowDays)
  const priorEnd = curStart
  const sparkStart = Math.max(0, anchorIdx - 29)

  const curWindow = days.slice(curStart, curEnd)
  const priorWindow = days.slice(priorStart, priorEnd)

  const kpis: KpiResult[] = dataset.metadata.metrics.map(meta => {
    const presentation = getPresentation(meta.key)
    const cur = presentation.aggregate(valuesFor(curWindow, meta.key))
    const prior = presentation.aggregate(valuesFor(priorWindow, meta.key))
    const sevRule = presentation.severity ?? deltaSeverity
    const severity = sevRule({ current: cur, prior, direction: meta.direction })
    return {
      meta,
      current: cur,
      prior,
      pctChange: pctSigned(cur, prior, meta.direction),
      rawPctChange: rawPct(cur, prior),
      severity,
      series30d: days.slice(sparkStart, anchorIdx + 1).map(d => ({
        date: d.date,
        value: d.metrics[meta.key] ?? null,
      })),
      formatted: presentation.format(cur),
      caption: presentation.caption,
      hint: presentation.hint,
    }
  })

  const alerts = kpis
    .filter(k => SEV_RANK[k.severity] >= SEV_RANK['watch'])
    .sort((a, b) => {
      const s = SEV_RANK[b.severity] - SEV_RANK[a.severity]
      if (s !== 0) return s
      return Math.abs(b.pctChange) - Math.abs(a.pctChange)
    })

  // ── Funnel — last 30 days, sums per step ──────────────────────────────────
  // Funnel is a flow metric, not a snapshot — needs more days for "won" volume.
  const last30 = days.slice(sparkStart, anchorIdx + 1)
  const totalOf = (key: MetricKey): number =>
    last30.reduce<number>((a, d) => a + (d.metrics[key] ?? 0), 0)

  const visits = totalOf('traffic')
  const leads = totalOf('leads_created')
  const qual = totalOf('leads_qualified')
  const deals = totalOf('deals_created')
  const won = totalOf('deals_won')

  const steps: FunnelStep[] = [
    { key: 'visits', label: 'Visits', total: visits, conversionFromPrev: null },
    { key: 'leads', label: 'Leads', total: leads, conversionFromPrev: safeDiv(leads, visits) },
    { key: 'qualified', label: 'Qualified', total: qual, conversionFromPrev: safeDiv(qual, leads) },
    { key: 'deals', label: 'Deals', total: deals, conversionFromPrev: safeDiv(deals, qual) },
    { key: 'won', label: 'Won', total: won, conversionFromPrev: safeDiv(won, deals) },
  ]

  const bottleneck = steps.slice(1).reduce<FunnelStep | null>((best, s) => {
    if (s.conversionFromPrev == null) return best
    if (best == null) return s
    return (best.conversionFromPrev ?? 1) > s.conversionFromPrev ? s : best
  }, null)

  // ── Win rate — period metric, not cohort ──────────────────────────────────
  // sum(won) / sum(won + lost) over the window, per the BRD.
  const wrFor = (window: DayPoint[]): number => {
    const w = window.reduce((a, d) => a + (d.metrics['deals_won'] ?? 0), 0)
    const l = window.reduce((a, d) => a + (d.metrics['deals_lost'] ?? 0), 0)
    return safeDiv(w, w + l)
  }
  const wrCur = wrFor(curWindow)
  const wrPrior = wrFor(priorWindow)
  const wrSev = deltaSeverity({ current: wrCur, prior: wrPrior, direction: 'higher_is_better' })

  return {
    anchorDate: days[anchorIdx].date,
    windowDays,
    kpis,
    alerts,
    funnel: { steps, bottleneck },
    winRate: {
      current: wrCur,
      prior: wrPrior,
      severity: wrSev,
      rawPctChange: rawPct(wrCur, wrPrior),
    },
  }
}
