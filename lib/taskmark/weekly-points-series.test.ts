import assert from "node:assert/strict"
import test from "node:test"

import {
  WEEKLY_HEATMAP_WINDOW,
  buildWeeklyCompletedPointsSeries,
} from "./weekly-points-series"

const NOW = new Date(2026, 7, 29)

test("empty boards fill the year window with zeros", () => {
  const series = buildWeeklyCompletedPointsSeries([], NOW)
  assert.equal(series.length, WEEKLY_HEATMAP_WINDOW)
  assert.ok(series.every((cell) => cell.points === 0))
  assert.equal(series.at(-1)?.key, "2026-W35")
})

test("a single done leaf fills its ISO week and earlier empty weeks in a short window", () => {
  const series = buildWeeklyCompletedPointsSeries(
    [{ completedAt: "2026-08-26T12:00:00Z", points: 5 }],
    NOW
  )
  assert.equal(series.length, 1)
  assert.equal(series[0]?.key, "2026-W35")
  assert.equal(series[0]?.points, 5)
})

test("two leaves in the same week sum points", () => {
  const series = buildWeeklyCompletedPointsSeries(
    [
      { completedAt: "2026-08-24", points: 3 },
      { completedAt: "2026-08-26T18:00:00Z", points: 5 },
    ],
    NOW
  )
  assert.equal(series.length, 1)
  assert.equal(series[0]?.points, 8)
})

test("skips unparseable dates, non-positive points, and still keeps zero weeks", () => {
  const series = buildWeeklyCompletedPointsSeries(
    [
      { completedAt: "not-a-date", points: 8 },
      { completedAt: "2026-08-26", points: 0 },
      { completedAt: "2026-08-26", points: -2 },
      { completedAt: "2026-08-10", points: 3 },
    ],
    NOW
  )
  assert.ok(series.length > 1)
  const withPoints = series.filter((cell) => cell.points > 0)
  assert.equal(withPoints.length, 1)
  assert.equal(withPoints[0]?.points, 3)
  assert.equal(series.at(-1)?.key, "2026-W35")
  assert.ok(series.some((cell) => cell.points === 0))
})
