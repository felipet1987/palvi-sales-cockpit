import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import type { Severity } from '@/data/types'
import { severityHex } from '@/ui/severity'

export interface SparklineProps {
  data: { date: string; value: number | null }[]
  severity?: Severity
  height?: number
}

export function Sparkline({ data, severity = 'ok', height = 44 }: SparklineProps) {
  const stroke = severityHex[severity]
  const id = `spark-${severity}`
  const valid = data.some(d => d.value != null)
  if (!valid) return <div className="h-[44px] text-ink-faint text-xs">no data</div>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={1.75}
          fill={`url(#${id})`}
          isAnimationActive={false}
          connectNulls
          dot={false}
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
