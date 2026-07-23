/** Shared list pagination types and defaults (1-based page index). */

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

export const DEFAULT_PAGE_SIZE: PageSize = 25

export type PaginationState = {
  /** 1-based page index. */
  page: number
  pageSize: PageSize
}

export type PageSliceResult<T> = {
  pageRows: T[]
  totalCount: number
  /** 0 when there are no rows; otherwise ≥ 1. */
  totalPages: number
  /** Clamped 1-based page. */
  page: number
  pageSize: PageSize
}

export function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value)
}

/**
 * Slice `rows` for the given 1-based `page` and `pageSize`.
 * Empty input → totalPages 0, page 1, empty pageRows.
 */
export function slicePage<T>(
  rows: readonly T[],
  page: number,
  pageSize: number
): PageSliceResult<T> {
  const size: PageSize = isPageSize(pageSize) ? pageSize : DEFAULT_PAGE_SIZE
  const totalCount = rows.length
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / size)
  const clampedPage =
    totalPages === 0 ? 1 : Math.min(Math.max(1, Math.trunc(page) || 1), totalPages)
  const start = (clampedPage - 1) * size
  return {
    pageRows: rows.slice(start, start + size) as T[],
    totalCount,
    totalPages,
    page: clampedPage,
    pageSize: size,
  }
}
