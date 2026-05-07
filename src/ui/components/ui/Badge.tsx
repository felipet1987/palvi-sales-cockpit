import * as React from 'react'
import { cn } from '@/lib/cn'
import type { Severity } from '@/data/types'
import { severityBg, severityLabel } from '@/ui/severity'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  severity?: Severity
}

export const Badge = ({ severity, className, children, ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
      severity ? severityBg[severity] : 'bg-bg-soft text-ink-muted border-border',
      className,
    )}
    {...props}
  >
    {children ?? (severity && severityLabel[severity])}
  </span>
)
