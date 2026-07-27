/** Timeframe filters for solved work items (`completed_at`). */

import {
  getISOWeek,
  getISOWeekYear,
  getISOWeeksInYear,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns"

import { parseTaskmarkDate } from "@/lib/format-date"

export type TimeframeFilterMode = "none" | "weeks" | "range"

export type TimeframeFilterState =
  | { mode: "none" }
  | {
      mode: "weeks"
      year: number
      weekFrom: number
      weekTo: number
    }
  | {
      mode: "range"
      /** YYYY-MM-DD */
      from: string
      /** YYYY-MM-DD */
      to: string
    }

export const DEFAULT_TIMEFRAME_FILTER: TimeframeFilterState = { mode: "none" }

export function isTimeframeActive(tf: TimeframeFilterState): boolean {
  return tf.mode !== "none"
}

export function timeframeResetKey(tf: TimeframeFilterState): string {
  if (tf.mode === "none") return "none"
  if (tf.mode === "weeks") {
    return `w:${tf.year}:${tf.weekFrom}-${tf.weekTo}`
  }
  return `r:${tf.from}:${tf.to}`
}

/** Calendar date as YYYY-MM-DD (local). */
export function toDateOnlyString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function isoWeekParts(date: Date): { year: number; week: number } {
  return { year: getISOWeekYear(date), week: getISOWeek(date) }
}

/** Shift an ISO week by `delta` weeks (negative = earlier). Handles year bounds. */
export function shiftIsoWeek(
  year: number,
  week: number,
  delta: number
): { year: number; week: number } {
  let y = year
  let w = week + delta
  while (w < 1) {
    y -= 1
    w += weeksInIsoYear(y)
  }
  while (w > weeksInIsoYear(y)) {
    w -= weeksInIsoYear(y)
    y += 1
  }
  return { year: y, week: w }
}

export function weeksInIsoYear(year: number): number {
  // 28 Dec is always in the last ISO week of that ISO year
  return getISOWeeksInYear(new Date(year, 11, 28))
}

export type YearWeekBounds = {
  years: number[]
  /** min/max ISO week observed per ISO week-year (from data). */
  weeksByYear: Record<number, { min: number; max: number }>
}

/** Collect ISO years and week bounds from completed_at values. */
export function deriveYearWeekBounds(
  completedAts: readonly (string | null | undefined)[]
): YearWeekBounds {
  const weeksByYear: Record<number, { min: number; max: number }> = {}
  for (const raw of completedAts) {
    const date = parseTaskmarkDate(raw)
    if (!date) continue
    const { year, week } = isoWeekParts(date)
    const cur = weeksByYear[year]
    if (!cur) {
      weeksByYear[year] = { min: week, max: week }
    } else {
      cur.min = Math.min(cur.min, week)
      cur.max = Math.max(cur.max, week)
    }
  }
  const years = Object.keys(weeksByYear)
    .map(Number)
    .sort((a, b) => a - b)
  return { years, weeksByYear }
}

export function defaultWeekRangeForYear(
  year: number,
  bounds: YearWeekBounds
): { weekFrom: number; weekTo: number } {
  const observed = bounds.weeksByYear[year]
  if (observed) return { weekFrom: observed.min, weekTo: observed.max }
  return { weekFrom: 1, weekTo: weeksInIsoYear(year) }
}

/**
 * Default slider range: current ISO week and the two weeks before it
 * (three weeks total), clamped within the current ISO week-year.
 */
export function recentWeekRange(
  now: Date = new Date()
): { year: number; weekFrom: number; weekTo: number } {
  const { year, week } = isoWeekParts(now)
  return {
    year,
    weekFrom: Math.max(1, week - 2),
    weekTo: week,
  }
}

/** True when weeks filter spans more than one week (slider UI). */
export function isWeekRangeSelection(
  timeframe: TimeframeFilterState
): boolean {
  if (timeframe.mode !== "weeks") return false
  return timeframe.weekFrom !== timeframe.weekTo
}

/** Map key for ISO week counts: `2026-W30`. */
export function isoWeekCountKey(year: number, week: number): string {
  return `${year}-W${week}`
}

/** Solved item with optional story points (stories + epic-direct leaves). */
export type SolvedCompletionSample = {
  completedAt: string | null | undefined
  points?: number | null
}

/**
 * Count solved items per ISO week (stories + epic-direct tasks/bugs).
 * Items without a parseable completed_at are skipped.
 */
export function countCompletionsByIsoWeek(
  completedAts: readonly (string | null | undefined)[]
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const raw of completedAts) {
    const date = parseTaskmarkDate(raw)
    if (!date) continue
    const { year, week } = isoWeekParts(date)
    const key = isoWeekCountKey(year, week)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * Count solved items per local calendar day (`YYYY-MM-DD`).
 */
export function countCompletionsByDate(
  completedAts: readonly (string | null | undefined)[]
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const raw of completedAts) {
    const date = parseTaskmarkDate(raw)
    if (!date) continue
    const key = toDateOnlyString(date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function samplePoints(points: number | null | undefined): number {
  return typeof points === "number" && Number.isFinite(points) && points > 0
    ? points
    : 0
}

/**
 * Sum story points of solved items per ISO week.
 */
export function sumPointsByIsoWeek(
  samples: readonly SolvedCompletionSample[]
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const sample of samples) {
    const date = parseTaskmarkDate(sample.completedAt)
    if (!date) continue
    const pts = samplePoints(sample.points)
    if (pts <= 0) continue
    const { year, week } = isoWeekParts(date)
    const key = isoWeekCountKey(year, week)
    totals.set(key, (totals.get(key) ?? 0) + pts)
  }
  return totals
}

/**
 * Sum story points of solved items per local calendar day (`YYYY-MM-DD`).
 */
export function sumPointsByDate(
  samples: readonly SolvedCompletionSample[]
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const sample of samples) {
    const date = parseTaskmarkDate(sample.completedAt)
    if (!date) continue
    const pts = samplePoints(sample.points)
    if (pts <= 0) continue
    const key = toDateOnlyString(date)
    totals.set(key, (totals.get(key) ?? 0) + pts)
  }
  return totals
}

/**
 * When a timeframe is active, rows without completed_at never match.
 * Weeks: ISO-8601 week-year + week in [weekFrom, weekTo].
 * Range: calendar day of completed_at within inclusive [from, to].
 */
export function passesTimeframeFilter(
  timeframe: TimeframeFilterState,
  completedAt: string | null | undefined
): boolean {
  if (timeframe.mode === "none") return true
  const date = parseTaskmarkDate(completedAt)
  if (!date) return false

  if (timeframe.mode === "weeks") {
    const { year, week } = isoWeekParts(date)
    if (year !== timeframe.year) return false
    const from = Math.min(timeframe.weekFrom, timeframe.weekTo)
    const to = Math.max(timeframe.weekFrom, timeframe.weekTo)
    return week >= from && week <= to
  }

  const fromDate = parseTaskmarkDate(timeframe.from)
  const toDate = parseTaskmarkDate(timeframe.to)
  if (!fromDate || !toDate) return false
  const start = startOfDay(fromDate <= toDate ? fromDate : toDate)
  const end = endOfDay(fromDate <= toDate ? toDate : fromDate)
  return isWithinInterval(date, { start, end })
}
