import assert from "node:assert/strict"
import test from "node:test"

import {
  aggregateWorkItemCounts,
  computeCurrentSpeedPtsPerWeek,
  computePeakCurrentSpeedPtsPerWeek,
  type MetricLeaf,
} from "./project-metrics"

const EMPTY_PEOPLE: MetricLeaf["reporters"] = []

function leaf(
  partial: Partial<MetricLeaf> & Pick<MetricLeaf, "id">
): MetricLeaf {
  return {
    kind: "task",
    parentId: "S-1",
    status: "done",
    points: 5,
    completedAt: "",
    reporters: EMPTY_PEOPLE,
    resolvers: EMPTY_PEOPLE,
    ...partial,
  }
}

test("all-done story plus tasks: complete equals total", () => {
  const counts = aggregateWorkItemCounts([
    leaf({ id: "S-1", kind: "story", parentId: "E-1", status: "done" }),
    leaf({ id: "T-1", parentId: "S-1", status: "done", points: 3 }),
    leaf({ id: "T-2", parentId: "S-1", status: "done", points: 5 }),
  ])
  assert.equal(counts.total, 3)
  assert.equal(counts.complete, 3)
})

test("mixed shelved and done: both count as complete", () => {
  const counts = aggregateWorkItemCounts([
    leaf({ id: "S-1", kind: "story", parentId: "E-1", status: "done" }),
    leaf({ id: "T-1", parentId: "S-1", status: "done" }),
    leaf({ id: "T-2", parentId: "S-1", status: "shelved" }),
  ])
  assert.equal(counts.total, 3)
  assert.equal(counts.complete, 3)
})

test("cancelled items count on both total and complete", () => {
  const counts = aggregateWorkItemCounts([
    leaf({ id: "S-1", kind: "story", parentId: "E-1", status: "cancelled" }),
    leaf({ id: "T-1", parentId: "S-1", status: "cancelled" }),
    leaf({ id: "B-1", kind: "bug", parentId: "S-1", status: "backlog" }),
  ])
  assert.equal(counts.total, 3)
  assert.equal(counts.complete, 2)
})

test("childless stories are excluded from both counts", () => {
  const counts = aggregateWorkItemCounts([
    leaf({ id: "S-empty", kind: "story", parentId: "E-1", status: "backlog" }),
    leaf({
      id: "T-epic",
      parentId: "E-1",
      status: "done",
      kind: "task",
    }),
    leaf({ id: "E-1", kind: "epic", parentId: "", status: "done" }),
  ])
  assert.equal(counts.total, 1)
  assert.equal(counts.complete, 1)
})

const NOW = new Date(2026, 7, 26) // Wed 26 Aug 2026, ISO week 35

test("current speed with now matches as-of today", () => {
  const leaves = [
    leaf({ id: "T-old", completedAt: "2026-08-13", points: 8 }),
    leaf({ id: "T-mid", completedAt: "2026-08-20", points: 8 }),
  ]
  const today = computeCurrentSpeedPtsPerWeek(leaves, NOW)
  assert.equal(today.average, 8)
  assert.equal(today.weekCount, 2)
})

test("peak is above current when an older high week left the 90-day window", () => {
  const leaves = [
    leaf({ id: "T-peak", completedAt: "2026-05-01", points: 40 }),
    leaf({ id: "T-a", completedAt: "2026-08-13", points: 5 }),
    leaf({ id: "T-b", completedAt: "2026-08-20", points: 5 }),
  ]
  const current = computeCurrentSpeedPtsPerWeek(leaves, NOW)
  const peak = computePeakCurrentSpeedPtsPerWeek(leaves, NOW)
  assert.equal(current.average, 5)
  assert.ok(peak.peak != null && peak.peak > (current.average ?? 0))
  assert.equal(peak.peak, 40)
  assert.ok(peak.weekLabel)
})

test("peak equals current when throughput never dropped", () => {
  const leaves = [
    leaf({ id: "T-a", completedAt: "2026-08-13", points: 8 }),
    leaf({ id: "T-b", completedAt: "2026-08-20", points: 8 }),
  ]
  const current = computeCurrentSpeedPtsPerWeek(leaves, NOW)
  const peak = computePeakCurrentSpeedPtsPerWeek(leaves, NOW)
  assert.equal(current.average, 8)
  assert.equal(peak.peak, 8)
  assert.ok(peak.peak != null && peak.peak >= current.average!)
})

test("no completions yields null speed and null peak", () => {
  const leaves = [
    leaf({ id: "T-open", status: "backlog", completedAt: "" }),
  ]
  assert.deepEqual(computeCurrentSpeedPtsPerWeek(leaves, NOW), {
    average: null,
    weekCount: 0,
  })
  assert.deepEqual(computePeakCurrentSpeedPtsPerWeek(leaves, NOW), {
    peak: null,
    weekLabel: null,
  })
})

test("zero-point weeks are ignored in current speed and peak", () => {
  const leaves = [
    leaf({ id: "T-zero", completedAt: "2026-08-06", points: 0 }),
    leaf({ id: "T-real", completedAt: "2026-08-20", points: 12 }),
  ]
  const current = computeCurrentSpeedPtsPerWeek(leaves, NOW)
  const peak = computePeakCurrentSpeedPtsPerWeek(leaves, NOW)
  assert.equal(current.average, 12)
  assert.equal(current.weekCount, 1)
  assert.equal(peak.peak, 12)
})
