import type { Severity } from '@/data/types'

export const severityHex: Record<Severity, string> = {
  ok: '#10b981',
  watch: '#f59e0b',
  alert: '#fb923c',
  crit: '#ef4444',
}

export const severityLabel: Record<Severity, string> = {
  ok: 'OK',
  watch: 'Watch',
  alert: 'Alert',
  crit: 'Critical',
}

export const severityBg: Record<Severity, string> = {
  ok: 'bg-ok/15 text-ok border-ok/30',
  watch: 'bg-watch/15 text-watch border-watch/30',
  alert: 'bg-alert/15 text-alert border-alert/30',
  crit: 'bg-crit/15 text-crit border-crit/30',
}

export const severityDot: Record<Severity, string> = {
  ok: 'bg-ok',
  watch: 'bg-watch',
  alert: 'bg-alert',
  crit: 'bg-crit',
}
