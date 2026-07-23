"use client"

import type { DetailChildItem } from "@/lib/taskmark/detail-types"
import {
  PriorityBadge,
  StatusBadge,
  TypeBadge,
} from "@/components/board/status-badge"
import { useWorkItemSheet } from "@/components/board/work-item-sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DetailChildrenListProps = {
  childrenItems: DetailChildItem[]
  emptyLabel: string
}

export function DetailChildrenList({
  childrenItems,
  emptyLabel,
}: DetailChildrenListProps) {
  const { openDetail } = useWorkItemSheet()

  if (childrenItems.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="flex w-full flex-col gap-2">
      {childrenItems.map((child) => {
        const kind = child.type === "story" ? "story" : "item"
        return (
          <li key={`${child.type}:${child.id}:${child.filePath}`} className="w-full">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-auto w-full flex-col items-stretch gap-1.5 px-3 py-2.5 text-left font-normal whitespace-normal"
              )}
              onClick={() =>
                openDetail({
                  kind,
                  id: child.id,
                  title: child.title,
                  filePath: child.filePath,
                  itemType:
                    child.type === "task" || child.type === "bug"
                      ? child.type
                      : undefined,
                })
              }
            >
              <span className="w-full text-sm font-medium leading-snug">
                {child.title}
              </span>
              <span className="flex w-full flex-wrap items-center gap-1.5">
                <span className="font-mono text-xs text-muted-foreground">
                  {child.id}
                </span>
                <TypeBadge type={child.type} />
                <StatusBadge status={child.status} />
                <PriorityBadge priority={child.priority} />
              </span>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
