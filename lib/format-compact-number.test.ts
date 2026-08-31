import assert from "node:assert/strict"
import test from "node:test"

import {
  formatCompactNumber,
  formatExactNumber,
} from "./format-compact-number"
import { formatSpeedPtsPerWeek } from "./taskmark/project-metrics-shared"

test("values below 1000 stay ordinary numbers", () => {
  assert.equal(formatCompactNumber(0), "0")
  assert.equal(formatCompactNumber(12.5), "12.5")
  assert.equal(formatCompactNumber(999), "999")
})

test("thousands, millions, and billions use K, M, and B", () => {
  assert.equal(formatCompactNumber(1000), "1K")
  assert.equal(formatCompactNumber(1500), "1.5K")
  assert.equal(formatCompactNumber(1_000_000), "1M")
  assert.equal(formatCompactNumber(1_500_000), "1.5M")
  assert.equal(formatCompactNumber(1_000_000_000), "1B")
})

test("non-finite values become an em dash", () => {
  assert.equal(formatCompactNumber(Number.NaN), "—")
  assert.equal(formatCompactNumber(Number.POSITIVE_INFINITY), "—")
})

test("exact titles keep grouping without compact suffixes", () => {
  assert.equal(formatExactNumber(1500), "1,500")
  assert.equal(formatExactNumber(1_000_000), "1,000,000")
})

test("speed labels round to whole numbers then compact", () => {
  assert.equal(formatSpeedPtsPerWeek(8), "8")
  assert.equal(formatSpeedPtsPerWeek(228.2), "228")
  assert.equal(formatSpeedPtsPerWeek(228.5), "229")
  assert.equal(formatSpeedPtsPerWeek(1500.4), "1.5K")
  assert.equal(formatSpeedPtsPerWeek(null), "—")
})
