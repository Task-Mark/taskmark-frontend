"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { typeBadgeClass } from "@/components/board/status-badge"
import { cn } from "@/lib/utils"

type ParentTagBadgeProps = {
  id: string
  title: string
  kind?: "epic" | "story"
}

/** UI parent badge: shows id; tooltip shows title. */
export function ParentTagBadge({
  id,
  title,
  kind = "epic",
}: ParentTagBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              variant="outline"
              className={cn(
                "cursor-default font-mono text-xs",
                typeBadgeClass(kind)
              )}
              title={title || id}
            />
          }
        >
          {id}
        </TooltipTrigger>
        <TooltipContent>{title || id}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
