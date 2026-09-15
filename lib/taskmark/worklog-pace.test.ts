import assert from "node:assert/strict"
import test from "node:test"

import {
  dailyWorklogHistory,
  dailyWorklogPace,
  WORKLOG_PACE_LOOKBACK_DAYS,
  worklogPaceIcon,
} from "@taskmark/components/board-model"

function localAt(day: string, hour: number): Date {
  const [year, month, date] = day.split("-").map(Number)
  return new Date(year, month - 1, date, hour, 0, 0, 0)
}

function startedAt(day: string, hour: number): { started: string } {
  return { started: localAt(day, hour).toISOString() }
}

test("a day with no work logs sleeps even after the end-of-day hour", () => {
  const evening = localAt("2026-09-07", 19)

  assert.equal(worklogPaceIcon({ today: 0, peak: 8 }, evening), "zzz")
  assert.equal(worklogPaceIcon({ today: 0, peak: 0 }, evening), "zzz")
})

test("end of day stays annoyed for a day that worked below half the peak", () => {
  const evening = localAt("2026-09-07", 19)

  assert.equal(worklogPaceIcon({ today: 1, peak: 8 }, evening), "annoyed")
  assert.equal(worklogPaceIcon({ today: 5, peak: 8 }, evening), "smile")
  assert.equal(worklogPaceIcon({ today: 7, peak: 8 }, evening), "flame")
})

test("history shows zzz for idle past days and annoyed only for slow ones", () => {
  const now = localAt("2026-09-07", 19)
  const entries = [
    ...Array.from({ length: 4 }, () => startedAt("2026-09-04", 10)),
    startedAt("2026-09-06", 10),
  ]

  const history = dailyWorklogHistory(entries, now, 4)

  assert.deepEqual(
    history.map((day) => [day.day, day.count, day.icon]),
    [
      ["2026-09-04", 4, "flame"],
      ["2026-09-05", 0, "zzz"],
      ["2026-09-06", 1, "annoyed"],
      ["2026-09-07", 0, "zzz"],
    ]
  )
})

test("uses a 10-day peak and ignores a busier day older than that window", () => {
  assert.equal(WORKLOG_PACE_LOOKBACK_DAYS, 10)
  const now = localAt("2026-09-15", 12)
  const entries = [
    ...Array.from({ length: 82 }, () => startedAt("2026-08-20", 10)),
    ...Array.from({ length: 3 }, () => startedAt("2026-09-10", 10)),
    startedAt("2026-09-15", 9),
  ]

  const pace = dailyWorklogPace(entries, now)
  assert.equal(pace.today, 1)
  assert.equal(pace.peak, 3)
})

test("falls back to the last worked project day when the last 10 days are idle", () => {
  const now = localAt("2026-09-15", 12)
  const entries = Array.from({ length: 82 }, () => startedAt("2026-08-20", 10))

  const pace = dailyWorklogPace(entries, now)
  assert.equal(pace.today, 0)
  assert.equal(pace.peak, 82)
})
