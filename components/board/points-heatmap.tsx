"use client"

import { format } from "date-fns"

import {
  buildPointsCalendar,
  pointsHeatLevel,
  type PointsCalendarDay,
  type PointsCalendarWeek,
} from "@/lib/taskmark/points-calendar"
import type { SolvedCompletionSample } from "@/lib/taskmark/timeframe-filters"
import { cn } from "@/lib/utils"

/** White through #C4A1FF: darker means more story points completed. */
const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-white dark:bg-neutral-900",
  1: "bg-[#f0e8ff] dark:bg-[#2f2542]",
  2: "bg-[#e2d0ff] dark:bg-[#4c3a73]",
  3: "bg-[#d3b9ff] dark:bg-[#8368c0]",
  4: "bg-[#c4a1ff]",
}

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""]
const CELL_SIZE = "0.75rem"
const CELL_GAP = "3px"

function pointsLabel(points: number): string {
  return points === 1 ? "1 story point" : `${points} story points`
}

function dayLabel(day: PointsCalendarDay): string {
  return `${format(day.date, "MMM d, yyyy")} · ${pointsLabel(day.points)}`
}

function monthLabels(weeks: readonly PointsCalendarWeek[]): string[] {
  let previous: number | null = null
  return weeks.map((week, index) => {
    const first = week.days[0]!.date
    const month = first.getMonth()
    const changed = previous !== null && month !== previous
    previous = month
    // Skip the last column so a label never runs past the grid.
    if (!changed || index >= weeks.length - 1) return ""
    return format(first, "MMM")
  })
}

function HeatmapCell({ day, maxPoints }: { day: PointsCalendarDay; maxPoints: number }) {
  if (day.isFuture) return <span aria-hidden className="size-3" />

  const level = pointsHeatLevel(day.points, maxPoints)
  const className = cn(
    "size-3 rounded-[2px] border border-black/20 dark:border-white/15",
    LEVEL_CLASS[level]
  )
  const label = dayLabel(day)

  if (day.points <= 0) {
    return <span aria-hidden title={label} className={className} />
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        className,
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      )}
    />
  )
}

type PointsHeatmapProps = {
  samples: readonly SolvedCompletionSample[]
  now?: Date
}

export function PointsHeatmap({ samples, now }: PointsHeatmapProps) {
  const calendar = buildPointsCalendar(samples, now)
  const { weeks, maxPoints, totalPoints, start, end } = calendar
  const labels = monthLabels(weeks)
  const summary = `Story points completed per day between ${format(start, "MMM d, yyyy")} and ${format(end, "MMM d, yyyy")}: ${pointsLabel(totalPoints)} in total.`

  return (
    <section
      className="border-2 border-black bg-card p-4 shadow-[4px_4px_0_0_var(--shadow-color)]"
      aria-label="Completed story points calendar"
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-head text-base tracking-tight">Story points</h2>
          <p className="text-xs text-muted-foreground">
            Done tasks and bugs over the last year
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {maxPoints > 0
            ? `${pointsLabel(totalPoints)} completed`
            : "No completed story points in this window yet."}
        </p>
      </div>

      <p className="sr-only">{summary}</p>

      <div className="overflow-x-auto pb-1">
        <div className="mx-auto flex w-max gap-1.5">
          <div
            className="grid shrink-0"
            style={{
              gridTemplateRows: `repeat(7, ${CELL_SIZE})`,
              rowGap: CELL_GAP,
              // Clear the month-label row so weekday labels line up with their cells.
              paddingTop: `calc(${CELL_SIZE} + ${CELL_GAP})`,
            }}
            aria-hidden
          >
            {WEEKDAY_LABELS.map((label, index) => (
              <span
                key={`weekday-${index}`}
                className="flex items-center pr-1 text-[9px] leading-none text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex flex-col" style={{ rowGap: CELL_GAP }}>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, ${CELL_SIZE})`,
                columnGap: CELL_GAP,
              }}
              aria-hidden
            >
              {labels.map((label, index) => (
                <span
                  key={`month-${weeks[index]?.key ?? index}`}
                  className="h-3 whitespace-nowrap text-[9px] leading-3 text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>

            <div
              className="grid grid-flow-col"
              style={{
                gridTemplateRows: `repeat(7, ${CELL_SIZE})`,
                gridAutoColumns: CELL_SIZE,
                gap: CELL_GAP,
              }}
            >
              {weeks.flatMap((week) =>
                week.days.map((day) => (
                  <HeatmapCell key={day.key} day={day} maxPoints={maxPoints} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="flex items-center gap-1" aria-hidden>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <span
              key={level}
              className={cn(
                "size-3 rounded-[2px] border border-black/20 dark:border-white/15",
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
