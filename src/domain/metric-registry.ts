// ─────────────────────────────────────────────────────────────────────────────
// metric-registry.ts
//
// Single source of truth for HOW each metric is presented to the Sales Manager.
// Every metric flows through one row here:
//   - aggregate: collapse the daily series of a window into a single number
//                (mean / last — different metrics have different shapes)
//   - format:    render that number for humans (units, precision)
//   - caption:   small label printed next to the value (e.g. "/d", "min")
//   - severity:  decide if the user should care; defaults to deltaSeverity
//   - hint:      one-liner shown on the card so the user does not have to guess
//
// The UI is dumb on purpose: KpiCard reads a Presentation, never special-cases
// metric keys. New metric? Add a row here, nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

import type { Direction, MetricKey, Severity } from '@/data/types'

// ── Aggregators ──────────────────────────────────────────────────────────────
// Both return 0 when the window has no usable data. Severity rules short-circuit
// when prior === 0, so "no signal" never surfaces as a false alert.
export type Aggregator = (values: (number | null)[]) => number

const meanIgnoreNull: Aggregator = (xs) => {
  const v = xs.filter((x): x is number => x !== null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
}

const lastNonNull: Aggregator = (xs) => {
  for (let i = xs.length - 1; i >= 0; i--) {
    const v = xs[i]
    if (v !== null && v !== undefined) return v
  }
  return 0
}

// ── Formatters ───────────────────────────────────────────────────────────────
export type Formatter = (value: number) => string

const int: Formatter = (n) => Math.round(n).toLocaleString('en-US')
const dec1: Formatter = (n) => n.toFixed(1)

// ── Severity ─────────────────────────────────────────────────────────────────
export interface SeverityInput {
  current: number
  prior: number
  direction: Direction
}
export type SeverityRule = (input: SeverityInput) => Severity

const SEV_RANK: Record<Severity, number> = { ok: 0, watch: 1, alert: 2, crit: 3 }
const maxSev = (a: Severity, b: Severity): Severity =>
  SEV_RANK[a] >= SEV_RANK[b] ? a : b

/**
 * Default rule: how big is the *bad* move vs the prior window?
 * Direction-aware — a +30 % jump in deals_lost is bad; the same in deals_won is good.
 *
 * prior === 0 short-circuits to OK so an empty / null-only window never produces
 * a false alert. Thresholds at -5 / -15 / -30 % map to OK / WATCH / ALERT / CRIT.
 */
export const deltaSeverity: SeverityRule = ({ current, prior, direction }) => {
  if (!Number.isFinite(prior) || prior === 0) return 'ok'
  const pctChange = (current - prior) / Math.abs(prior)
  const signed = direction === 'higher_is_better' ? pctChange : -pctChange
  if (signed >= -0.05) return 'ok'
  if (signed >= -0.15) return 'watch'
  if (signed >= -0.30) return 'alert'
  return 'crit'
}

// ── Domain-specific overrides ────────────────────────────────────────────────
// These exist when the generic delta rule would mislead. We escalate based on
// absolute thresholds the Sales Manager actually cares about, then take the
// max of trend severity and absolute severity.

/** stale_deals: a count of 150+ open >60d deals is bad regardless of trend. */
const staleDealsSeverity: SeverityRule = (input) => {
  const trend = deltaSeverity(input)
  const abs: Severity =
    input.current >= 150 ? 'crit' :
    input.current >= 100 ? 'alert' :
    input.current >= 60  ? 'watch' : 'ok'
  return maxSev(trend, abs)
}

/** avg_response_time_min: B2B benchmark — under 15 min wins, over 60 min bleeds. */
const responseTimeSeverity: SeverityRule = (input) => {
  const trend = deltaSeverity(input)
  const abs: Severity =
    input.current >= 90 ? 'crit' :
    input.current >= 60 ? 'alert' :
    input.current >= 30 ? 'watch' : 'ok'
  return maxSev(trend, abs)
}

// ── Presentation ─────────────────────────────────────────────────────────────
export interface Presentation {
  aggregate: Aggregator
  format: Formatter
  caption: string
  severity?: SeverityRule
  hint: string
}

export const REGISTRY: Record<MetricKey, Presentation> = {
  traffic: {
    aggregate: meanIgnoreNull,
    format: int,
    caption: '/d',
    hint: 'Daily unique visits to the marketing site.',
  },
  leads_created: {
    aggregate: meanIgnoreNull,
    format: dec1,
    caption: '/d',
    hint: 'New leads captured per day, on average.',
  },
  leads_qualified: {
    aggregate: meanIgnoreNull,
    format: dec1,
    caption: '/d',
    hint: 'Leads sales accepted as real prospects.',
  },
  deals_created: {
    aggregate: meanIgnoreNull,
    format: dec1,
    caption: '/d',
    hint: 'New sales opportunities opened.',
  },
  deals_won: {
    aggregate: meanIgnoreNull,
    format: dec1,
    caption: '/d',
    hint: 'Deals closed-won per day.',
  },
  deals_lost: {
    aggregate: meanIgnoreNull,
    format: dec1,
    caption: '/d',
    hint: 'Deals closed-lost per day.',
  },
  avg_response_time_min: {
    aggregate: meanIgnoreNull,
    format: dec1,
    caption: 'min',
    severity: responseTimeSeverity,
    hint: 'Time-to-first-touch on a new lead. In B2B, slow tanks conversion.',
  },
  avg_deal_cycle_days: {
    aggregate: meanIgnoreNull,
    format: dec1,
    caption: 'days',
    hint: 'Days from open to close, averaged over deals that closed in the window.',
  },
  stale_deals: {
    // Snapshot metric: take the latest non-null value, summing makes no sense.
    aggregate: lastNonNull,
    format: int,
    caption: 'open >60d',
    severity: staleDealsSeverity,
    hint: 'Open deals older than 60 days. These rot the pipeline.',
  },
  support_tickets_opened: {
    aggregate: meanIgnoreNull,
    format: dec1,
    caption: '/d',
    hint: 'New support tickets per day.',
  },
  support_avg_resolution_hours: {
    aggregate: meanIgnoreNull,
    format: dec1,
    caption: 'hr',
    hint: 'Average hours to resolve tickets opened today.',
  },
}

const FALLBACK: Presentation = {
  aggregate: meanIgnoreNull,
  format: dec1,
  caption: '',
  hint: '',
}

export function getPresentation(key: MetricKey): Presentation {
  return REGISTRY[key] ?? FALLBACK
}
