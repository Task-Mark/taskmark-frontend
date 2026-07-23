"use client"

import { useEffect, useMemo, useState } from "react"

import {
  DEFAULT_PAGE_SIZE,
  isPageSize,
  slicePage,
  type PageSize,
  type PageSliceResult,
} from "@/lib/taskmark/pagination"

export type UsePaginatedRowsResult<T> = PageSliceResult<T> & {
  setPage: (page: number) => void
  setPageSize: (pageSize: PageSize) => void
}

/**
 * Client pagination state for a row list.
 * When `resetKey` changes (e.g. selected epic/story), page resets to 1.
 */
export function usePaginatedRows<T>(
  rows: readonly T[],
  resetKey?: string
): UsePaginatedRowsResult<T> {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState<PageSize>(DEFAULT_PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const sliced = useMemo(
    () => slicePage(rows, page, pageSize),
    [rows, page, pageSize]
  )

  // Keep local page in sync when clamping shrinks it (e.g. fewer rows).
  useEffect(() => {
    if (sliced.page !== page) setPage(sliced.page)
  }, [sliced.page, page])

  function setPageSize(next: PageSize | number) {
    const size = isPageSize(next) ? next : DEFAULT_PAGE_SIZE
    setPageSizeState(size)
    setPage(1)
  }

  return {
    ...sliced,
    setPage,
    setPageSize,
  }
}
