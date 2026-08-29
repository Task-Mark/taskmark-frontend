import { addDays, endOfISOWeek, startOfDay, startOfISOWeek, subWeeks } from "date-fns"

import {
  sumPointsByDate,
  toDateOnlyString,
  type SolvedCompletionSample,
} from "@/lib/taskmark/timeframe-filters"

/** Columns in the calendar: one year of ISO weeks ending at the current week. */
export const POINTS_CALENDAR_WEEKS = 53

export type PointsCalendarDay = {
  date: Date
  /** YYYY-MM-DD */
  key: string
  points: number
  /** Days after today: rendered as blanks so the grid stays honest. */
  isFuture: boolean
}

export type PointsCalendarWeek = {
  key: string
  days: PointsCalendarDay[]
}

export type PointsCalendar = {
  weeks: PointsCalendarWeek[]
  maxPoints: number
  totalPoints: number
  start: Date
  end: Date
}

/**
 * Daily story points completed on done task/bug leaves, laid out as a
 * contribution calendar: every column is an ISO week, every cell one day.
 * Days without completions are zeros, never missing cells.
 */
export function buildPointsCalendar(
  samples: readonly SolvedCompletionSample[],
  now: Date = new Date()
): PointsCalendar {
  const totals = sumPointsByDate(samples)
  const start = startOfISOWeek(subWeeks(now, POINTS_CALENDAR_WEEKS - 1))
  const end = endOfISOWeek(now)
  const today = startOfDay(now)

  const weeks: PointsCalendarWeek[] = []
  let maxPoints = 0
  let totalPoints = 0
  let cursor = start

  while (cursor.getTime() <= end.getTime()) {
    const days: PointsCalendarDay[] = []
    for (let offset = 0; offset < 7; offset++) {
      const date = addDays(cursor, offset)
      const key = toDateOnlyString(date)
      const points = totals.get(key) ?? 0
      maxPoints = Math.max(maxPoints, points)
      totalPoints += points
      days.push({
        date,
        key,
        points,
        isFuture: startOfDay(date).getTime() > today.getTime(),
      })
    }
    weeks.push({ key: toDateOnlyString(cursor), days })
    cursor = addDays(cursor, 7)
  }

  return { weeks, maxPoints, totalPoints, start, end }
}

/** Discrete 0–4 intensity from empty through the calendar maximum. */
export function pointsHeatLevel(
  points: number,
  maxPoints: number
): 0 | 1 | 2 | 3 | 4 {
  if (points <= 0 || maxPoints <= 0) return 0
  const ratio = points / maxPoints
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}
