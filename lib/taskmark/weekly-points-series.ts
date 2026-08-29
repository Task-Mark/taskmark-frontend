import {
  endOfISOWeek,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
} from "date-fns"

import { parseTaskmarkDate } from "@/lib/format-date"
import {
  isoWeekCountKey,
  isoWeekParts,
  shiftIsoWeek,
  sumPointsByIsoWeek,
  type SolvedCompletionSample,
} from "@/lib/taskmark/timeframe-filters"

/** About one year of ISO weeks, ending at the current week. */
export const WEEKLY_HEATMAP_WINDOW = 52

export type WeeklyPointsCell = {
  year: number
  week: number
  key: string
  points: number
  start: Date
  end: Date
}

export function isoWeekDateRange(
  year: number,
  week: number
): { start: Date; end: Date } {
  let date = new Date(year, 5, 15)
  date = setISOWeekYear(date, year)
  date = setISOWeek(date, week)
  return { start: startOfISOWeek(date), end: endOfISOWeek(date) }
}

function weekIndex(year: number, week: number): number {
  return year * 100 + week
}

/**
 * ISO weeks of completed task/bug story points for the Overall heatmap.
 * Empty weeks in the window are zeros, not omitted cells.
 */
export function buildWeeklyCompletedPointsSeries(
  samples: readonly SolvedCompletionSample[],
  now: Date = new Date()
): WeeklyPointsCell[] {
  const current = isoWeekParts(now)
  const totals = sumPointsByIsoWeek(samples)

  let first: { year: number; week: number } | null = null
  for (const sample of samples) {
    const date = parseTaskmarkDate(sample.completedAt)
    if (!date) continue
    const pts =
      typeof sample.points === "number" &&
      Number.isFinite(sample.points) &&
      sample.points > 0
        ? sample.points
        : 0
    if (pts <= 0) continue
    const parts = isoWeekParts(date)
    if (!first || weekIndex(parts.year, parts.week) < weekIndex(first.year, first.week)) {
      first = parts
    }
  }

  const yearStart = shiftIsoWeek(current.year, current.week, -(WEEKLY_HEATMAP_WINDOW - 1))
  let start = yearStart
  if (first && weekIndex(first.year, first.week) > weekIndex(yearStart.year, yearStart.week)) {
    start = first
  }

  const cells: WeeklyPointsCell[] = []
  let year = start.year
  let week = start.week
  for (let i = 0; i < WEEKLY_HEATMAP_WINDOW + 8; i++) {
    const key = isoWeekCountKey(year, week)
    const { start: rangeStart, end } = isoWeekDateRange(year, week)
    cells.push({
      year,
      week,
      key,
      points: totals.get(key) ?? 0,
      start: rangeStart,
      end,
    })
    if (year === current.year && week === current.week) break
    const next = shiftIsoWeek(year, week, 1)
    year = next.year
    week = next.week
  }
  return cells
}

/** Discrete 0–4 intensity from empty through the series max. */
export function weeklyPointsHeatLevel(points: number, maxPoints: number): 0 | 1 | 2 | 3 | 4 {
  if (points <= 0 || maxPoints <= 0) return 0
  const t = points / maxPoints
  if (t <= 0.25) return 1
  if (t <= 0.5) return 2
  if (t <= 0.75) return 3
  return 4
}
