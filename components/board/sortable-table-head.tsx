"use client"

import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { TableSortDirection, TableSortKey } from "@/lib/taskmark/table-sort"

type SortableTableHeadProps = {
  label: string
  sortKey: TableSortKey
  activeKey: TableSortKey | null
  direction: TableSortDirection | null
  onSort: (key: TableSortKey) => void
  className?: string
}

export function SortableTableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: SortableTableHeadProps) {
  const active = activeKey === sortKey
  const ariaSort = active
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none"

  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn("p-0", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex h-10 w-full items-center gap-1.5 px-2 text-left font-medium whitespace-nowrap",
          "rounded-sm hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          active ? "text-foreground" : "text-foreground/80"
        )}
      >
        <span>{label}</span>
        <span className="inline-flex size-3.5 shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
          {active && direction === "asc" ? (
            <ArrowUpIcon className="size-3.5 text-foreground" />
          ) : active && direction === "desc" ? (
            <ArrowDownIcon className="size-3.5 text-foreground" />
          ) : (
            <ArrowUpDownIcon className="size-3.5 opacity-50" />
          )}
        </span>
        <span className="sr-only">
          {!active
            ? "activate to sort ascending"
            : direction === "asc"
              ? "sorted ascending; activate to sort descending"
              : "sorted descending; activate to clear sort"}
        </span>
      </button>
    </TableHead>
  )
}
