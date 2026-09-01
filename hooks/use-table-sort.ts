"use client"

import { useCallback, useState } from "react"

import {
  toggleTableSort,
  type TableSortKey,
  type TableSortState,
} from "@/lib/taskmark/table-sort"

export function useTableSort(initial: TableSortState | null = null): {
  sort: TableSortState | null
  onSort: (key: TableSortKey) => void
  setSort: (next: TableSortState | null) => void
} {
  const [sort, setSort] = useState<TableSortState | null>(initial)

  const onSort = useCallback((key: TableSortKey) => {
    setSort((current) => toggleTableSort(current, key))
  }, [])

  return { sort, onSort, setSort }
}
