import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/Tabs'
import type { DatasetId } from '@/data/types'
import { DATASET_IDS } from '@/data/loader'

interface Props {
  value: DatasetId
  onChange: (id: DatasetId) => void
}

export function DatasetSwitcher({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as DatasetId)}>
      <TabsList>
        {DATASET_IDS.map((id) => (
          <TabsTrigger key={id} value={id}>
            {id}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
