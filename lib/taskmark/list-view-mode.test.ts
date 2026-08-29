import assert from "node:assert/strict"
import test from "node:test"

import {
  compareByStatusThenPriority,
  statusSortRank,
} from "./list-view-mode"

test("sorts every incomplete status before shelved", () => {
  assert.ok(statusSortRank("backlog") < statusSortRank("shelved"))
  assert.ok(statusSortRank("in_progress") < statusSortRank("shelved"))
  assert.ok(statusSortRank("blocked") < statusSortRank("shelved"))
})

test("sorts shelved rows by completion date instead of priority", () => {
  const olderHighPriority = {
    id: "T-1",
    status: "shelved",
    priority: "critical",
    completedAt: "2026-08-01",
  }
  const newerLowPriority = {
    id: "T-2",
    status: "shelved",
    priority: "low",
    completedAt: "2026-08-29",
  }

  assert.ok(
    compareByStatusThenPriority(olderHighPriority, newerLowPriority) > 0
  )
})
