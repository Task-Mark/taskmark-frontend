import assert from "node:assert/strict"
import test from "node:test"

import {
  POINTS_CALENDAR_WEEKS,
  buildPointsCalendar,
  pointsHeatLevel,
} from "./points-calendar"

const NOW = new Date(2026, 7, 29)

test("empty boards fill a year of weeks with zero days", () => {
  const calendar = buildPointsCalendar([], NOW)
  assert.equal(calendar.weeks.length, POINTS_CALENDAR_WEEKS)
  assert.ok(calendar.weeks.every((week) => week.days.length === 7))
  assert.equal(calendar.maxPoints, 0)
  assert.equal(calendar.totalPoints, 0)
})

test("a single done leaf lands on its own day", () => {
  const calendar = buildPointsCalendar(
    [{ completedAt: "2026-08-26T12:00:00Z", points: 5 }],
    NOW
  )
  const days = calendar.weeks.flatMap((week) => week.days)
  const filled = days.filter((day) => day.points > 0)
  assert.equal(filled.length, 1)
  assert.equal(filled[0]?.key, "2026-08-26")
  assert.equal(calendar.maxPoints, 5)
})

test("two leaves on the same day sum points", () => {
  const calendar = buildPointsCalendar(
    [
      { completedAt: "2026-08-26", points: 3 },
      { completedAt: "2026-08-26T18:00:00Z", points: 5 },
    ],
    NOW
  )
  const day = calendar.weeks
    .flatMap((week) => week.days)
    .find((candidate) => candidate.key === "2026-08-26")
  assert.equal(day?.points, 8)
  assert.equal(calendar.totalPoints, 8)
})

test("skips unparseable dates and non-positive points", () => {
  const calendar = buildPointsCalendar(
    [
      { completedAt: "not-a-date", points: 8 },
      { completedAt: "2026-08-26", points: 0 },
      { completedAt: "2026-08-26", points: -2 },
    ],
    NOW
  )
  assert.equal(calendar.totalPoints, 0)
})

test("marks days after today as future", () => {
  const calendar = buildPointsCalendar([], NOW)
  const days = calendar.weeks.flatMap((week) => week.days)
  const today = days.find((day) => day.key === "2026-08-29")
  const tomorrow = days.find((day) => day.key === "2026-08-30")
  assert.equal(today?.isFuture, false)
  assert.equal(tomorrow?.isFuture, true)
})

test("scales intensity from empty to the calendar maximum", () => {
  assert.equal(pointsHeatLevel(0, 8), 0)
  assert.equal(pointsHeatLevel(2, 8), 1)
  assert.equal(pointsHeatLevel(8, 8), 4)
})
