"use client"

import { SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FILTER_CHIPS_FIELD_CLASS } from "@/lib/taskmark/list-filters"
import { cn } from "@/lib/utils"

type ListSearchBoxProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
}

export function ListSearchBox({
  value,
  onChange,
  placeholder = "Search by id or name…",
  className,
  id = "list-search",
}: ListSearchBoxProps) {
  return (
    <div
      className={cn(
        FILTER_CHIPS_FIELD_CLASS,
        "min-w-[12rem] flex-1 max-w-sm",
        className
      )}
    >
      <SearchIcon
        className="size-3.5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-16 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        aria-label="Search by work item id or name"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="-mr-1 opacity-50 hover:opacity-100"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <XIcon className="size-3.5" />
        </Button>
      ) : null}
    </div>
  )
}
