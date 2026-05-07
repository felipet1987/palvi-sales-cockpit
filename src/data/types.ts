export type Direction = 'higher_is_better' | 'lower_is_better'

export type Severity = 'ok' | 'watch' | 'alert' | 'crit'

export type MetricKey = string

export interface MetricMeta {
  key: MetricKey
  label: string
  unit: string
  direction: Direction
  description: string
}

export interface DayPoint {
  date: string
  metrics: Record<MetricKey, number | null>
}

export interface DatasetMeta {
  start_date: string
  end_date: string
  days: number
  metrics: MetricMeta[]
}

export interface Dataset {
  metadata: DatasetMeta
  days: DayPoint[]
}

export type DatasetId = 'A' | 'B' | 'C' | 'D'

export type DatasetMap = Record<DatasetId, Dataset>
