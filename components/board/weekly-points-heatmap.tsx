"use client"

import { format } from "date-fns"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { SolvedCompletionSample } from "@/lib/taskmark/timeframe-filters"
import {
  buildWeeklyCompletedPointsSeries,
  weeklyPointsHeatLevel,
  type WeeklyPointsCell,
} from "@/lib/taskmark/weekly-points-series"

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-neutral-100 dark:bg-neutral-800",
  1: "bg-[#eadffe] dark:bg-[#2f2542]",
  2: "bg-[#c4a1ff]",
  3: "bg-[#ff30cd] dark:bg-[#ff7ce0]",
  4: "bg-[#01ffcc] dark:bg-[#5eead4]",
}

function formatWeekRange(cell: WeeklyPointsCell): string {
  const { start, end } = cell
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, "MMM d")}–${format(end, "d, yyyy")}`
    }
    return `${format(start, "MMM d")}–${format(end, "MMM d, yyyy")}`
  }
  return `${format(start, "MMM d, yyyy")}–${format(end, "MMM d, yyyy")}`
}

function pointsLabel(points: number): string {
  return points === 1 ? "1 story point" : `${points} story points`
}

function monthLabels(weeks: readonly WeeklyPointsCell[]): (string | null)[] {
  let prevMonth: string | null = null
  return weeks.map((cell) => {
    const label = format(cell.start, "MMM")
    if (label === prevMonth) return null
    prevMonth = label
    return label
  })
}

type WeeklyPointsHeatmapProps = {
  samples: readonly SolvedCompletionSample[]
  now?: Date
}

export function WeeklyPointsHeatmap({
  samples,
  now,
}: WeeklyPointsHeatmapProps) {
  const weeks = buildWeeklyCompletedPointsSeries(samples, now)
  const maxPoints = weeks.reduce((max, cell) => Math.max(max, cell.points), 0)
  const totalPoints = weeks.reduce((sum, cell) => sum + cell.points, 0)
  const labels = monthLabels(weeks)
  const allZero = maxPoints <= 0
  const first = weeks[0]
  const last = weeks.at(-1)
  const summary =
    first && last
      ? `Weekly completed story points from ${formatWeekRange(first)} through ${formatWeekRange(last)}. ${pointsLabel(totalPoints)} in total.`
      : "Weekly completed story points."

  return (
    <section
      className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] dark:bg-card"
      aria-label="Weekly completed story points"
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-head text-base tracking-tight">
            Weekly story points
          </h2>
          <p className="text-xs text-muted-foreground">
            Done tasks and bugs by ISO week
          </p>
        </div>
        {allZero ? (
          <p className="text-xs text-muted-foreground">
            No completed story points in this window yet.
          </p>
        ) : null}
      </div>

      <p className="sr-only">{summary}</p>

      <TooltipProvider>
        <div className="-mx-1 overflow-x-auto pb-1">
          <div
            className="inline-grid min-w-max gap-x-1 gap-y-1.5 p-1"
            style={{
              gridTemplateColumns: `repeat(${Math.max(weeks.length, 1)}, 1.75rem)`,
            }}
          >
            {labels.map((label, index) => (
              <span
                key={`m-${weeks[index]?.key ?? index}`}
                className="h-4 truncate text-[10px] font-medium leading-none text-muted-foreground"
              >
                {label ?? ""}
              </span>
            ))}
            {weeks.map((cell) => {
              const level = weeklyPointsHeatLevel(cell.points, maxPoints)
              const tip = `${formatWeekRange(cell)} · ${pointsLabel(cell.points)}`
              return (
                <Tooltip key={cell.key}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-label={tip}
                        className={cn(
                          "size-7 border-2 border-black shadow-[2px_2px_0_0_#000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:shadow-[2px_2px_0_0_#3d3d3d]",
                          LEVEL_CLASS[level]
                        )}
                      />
                    }
                  />
                  <TooltipContent>{tip}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>
      </TooltipProvider>

      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="flex items-center gap-1" aria-hidden>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <span
              key={level}
              className={cn(
                "size-3.5 border-2 border-black shadow-[1px_1px_0_0_#000]",
                LEVEL_CLASS[level]
              )}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </section>
  )
}
