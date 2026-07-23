"use client"

import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  PAGE_SIZE_OPTIONS,
  type PageSize,
} from "@/lib/taskmark/pagination"
import { cn } from "@/lib/utils"

type ListPaginationProps = {
  page: number
  totalPages: number
  totalCount: number
  pageSize: PageSize
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: PageSize) => void
  className?: string
}

export function ListPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: ListPaginationProps) {
  if (totalCount === 0) return null

  const safeTotalPages = Math.max(totalPages, 1)
  const atFirst = page <= 1
  const atLast = page >= safeTotalPages
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        {from}–{to} of {totalCount}
        <span className="mx-1.5 text-border">·</span>
        Page {page} of {safeTotalPages}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="list-page-size" className="text-xs text-muted-foreground">
            Rows
          </Label>
          <select
            id="list-page-size"
            className="h-8 rounded border-2 border-border bg-input px-2 text-sm shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as PageSize)
            }
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <nav aria-label="Pagination" className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="First page"
            disabled={atFirst}
            onClick={() => onPageChange(1)}
          >
            <ChevronFirstIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={atFirst}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={atLast}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Last page"
            disabled={atLast}
            onClick={() => onPageChange(safeTotalPages)}
          >
            <ChevronLastIcon />
          </Button>
        </nav>
      </div>
    </div>
  )
}
