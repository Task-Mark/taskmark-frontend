"use client"

import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type ChildProgressBarProps = {
  done: number
  total: number
  className?: string
}

/** Compact `done/total` for narrow rows where a progress bar does not fit. */
export function ChildProgressCount({
  done,
  total,
  className,
}: ChildProgressBarProps) {
  const safeDone = Math.max(0, Math.min(done, total))
  const pct = total > 0 ? Math.round((safeDone / total) * 100) : 0

  return (
    <span
      className={cn("font-medium tabular-nums", className)}
      title={
        total === 0
          ? "No child work items"
          : `${safeDone} of ${total} done (${pct}%)`
      }
    >
      {safeDone}/{total}
    </span>
  )
}

export function ChildProgressBar({
  done,
  total,
  className,
}: ChildProgressBarProps) {
  const safeDone = Math.max(0, Math.min(done, total))
  const pct = total > 0 ? Math.round((safeDone / total) * 100) : 0

  return (
    <Progress
      value={pct}
      className={cn("w-full min-w-[8rem] max-w-[12rem]", className)}
      title={
        total === 0
          ? "No child work items"
          : `${safeDone} of ${total} done (${pct}%)`
      }
    >
      <ProgressLabel className="text-xs">
        {total === 0 ? "No items" : `${safeDone}/${total} done`}
      </ProgressLabel>
      <ProgressValue className="text-xs" />
    </Progress>
  )
}
