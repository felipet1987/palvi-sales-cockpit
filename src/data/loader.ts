import metricsJson from '../../metrics.json'
import type { DatasetId, DatasetMap } from './types'

export const datasets = metricsJson as unknown as DatasetMap

export const DATASET_IDS: DatasetId[] = ['A', 'B', 'C', 'D']

export function isDatasetId(value: string | null | undefined): value is DatasetId {
  return !!value && (DATASET_IDS as string[]).includes(value)
}
