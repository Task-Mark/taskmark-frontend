"use client"

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

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
  /** Header label alignment (default start / left). */
  align?: "start" | "center" | "end"
}

export function SortableTableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
  align = "start",
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
          "inline-flex h-10 w-full items-center gap-1.5 px-2 font-medium whitespace-nowrap",
          "rounded-sm hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          active ? "text-foreground" : "text-foreground/80",
          align === "center" && "justify-center text-center",
          align === "end" && "justify-end text-right",
          align === "start" && "justify-start text-left"
        )}
      >
        <span>{label}</span>
        {active && direction === "asc" ? (
          <ArrowUpIcon className="size-3.5 shrink-0 text-foreground" aria-hidden />
        ) : active && direction === "desc" ? (
          <ArrowDownIcon className="size-3.5 shrink-0 text-foreground" aria-hidden />
        ) : null}
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
