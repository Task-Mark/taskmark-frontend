"use client"

import type { ReactNode } from "react"
import { StatusBadge } from "@/components/board/status-badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatListDate } from "@/lib/format-list-date"

type DateTooltipProps = {
  label: string
  date: string | null | undefined
  children: ReactNode
  className?: string
}

/** Tooltip showing "Label YYYY-MM-DD" (or "Label —" when missing). */
export function DateTooltip({
  label,
  date,
  children,
  className,
}: DateTooltipProps) {
  const text = `${label} ${formatListDate(date)}`
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className={className} />} title={text}>
          {children}
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** Item ID with creation-date tooltip. */
export function IdCreatedTooltip({
  id,
  created,
  children,
}: {
  id: string
  created: string | null | undefined
  children?: ReactNode
}) {
  return (
    <DateTooltip label="Created" date={created} className="font-mono text-xs">
      {children ?? id}
    </DateTooltip>
  )
}

/** Status badge; when done, wraps with solved-date tooltip. */
export function StatusWithSolvedTooltip({
  status,
  solvedAt,
}: {
  status: string
  solvedAt?: string | null
}) {
  const badge = <StatusBadge status={status} />
  if (status !== "done") return badge
  return <DateTooltip label="Solved" date={solvedAt}>{badge}</DateTooltip>
}
