import { useEffect, useState, useCallback } from 'react'
import type { DatasetId } from '@/data/types'
import { isDatasetId } from '@/data/loader'

const KEY = 'dataset'

function read(): DatasetId {
  if (typeof window === 'undefined') return 'A'
  const v = new URLSearchParams(window.location.search).get(KEY)
  return isDatasetId(v) ? v : 'A'
}

/** Two-way sync of selected dataset with the URL ?dataset=A param. */
export function useDatasetParam(): [DatasetId, (id: DatasetId) => void] {
  const [id, setId] = useState<DatasetId>(read)

  useEffect(() => {
    const onPop = () => setId(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const update = useCallback((next: DatasetId) => {
    setId(next)
    const url = new URL(window.location.href)
    url.searchParams.set(KEY, next)
    window.history.pushState({}, '', url)
  }, [])

  return [id, update]
}
