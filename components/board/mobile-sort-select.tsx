"use client"

import { Label } from "@/components/ui/label"
import type { TableSortKey, TableSortState } from "@/lib/taskmark/table-sort"
import { cn } from "@/lib/utils"

const SORT_OPTIONS: { key: TableSortKey; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "type", label: "Type" },
  { key: "title", label: "Title" },
  { key: "epic", label: "Epic" },
  { key: "size", label: "Size" },
  { key: "people", label: "People" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
]

type MobileSortSelectProps = {
  sort: TableSortState | null
  onSortChange: (next: TableSortState | null) => void
  id: string
  className?: string
}

export function MobileSortSelect({
  sort,
  onSortChange,
  id,
  className,
}: MobileSortSelectProps) {
  const value = sort ? `${sort.key}:${sort.direction}` : ""

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Label htmlFor={id} className="shrink-0 text-xs text-muted-foreground">
        Sort
      </Label>
      <select
        id={id}
        className="h-9 min-w-0 flex-1 rounded border-2 border-border bg-input px-2 text-sm shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        value={value}
        onChange={(event) => {
          const next = event.target.value
          if (!next) {
            onSortChange(null)
            return
          }
          const [key, direction] = next.split(":") as [
            TableSortKey,
            TableSortState["direction"],
          ]
          onSortChange({ key, direction })
        }}
      >
        <option value="">Default order</option>
        {SORT_OPTIONS.flatMap((option) => [
          <option key={`${option.key}:asc`} value={`${option.key}:asc`}>
            {option.label} A–Z
          </option>,
          <option key={`${option.key}:desc`} value={`${option.key}:desc`}>
            {option.label} Z–A
          </option>,
        ])}
      </select>
    </div>
  )
}
