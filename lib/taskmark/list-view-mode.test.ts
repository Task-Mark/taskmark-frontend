import assert from "node:assert/strict"
import test from "node:test"

import {
  compareByStatusThenPriority,
  listViewModes,
  parseListViewMode,
  statusSortRank,
} from "./list-view-mode"

test("omits changelog from the switcher when the file is absent", () => {
  assert.deepEqual(listViewModes(), ["overall", "workitems"])
  assert.equal(parseListViewMode("changelog"), "overall")
  assert.equal(parseListViewMode("changelog", { hasChangelog: false }), "overall")
})

test("keeps changelog when content is present", () => {
  assert.deepEqual(listViewModes({ hasChangelog: true }), [
    "overall",
    "workitems",
    "changelog",
  ])
  assert.equal(parseListViewMode("changelog", { hasChangelog: true }), "changelog")
})

test("omits reports from the switcher when no report exists", () => {
  assert.deepEqual(listViewModes({ hasChangelog: true }), [
    "overall",
    "workitems",
    "changelog",
  ])
  assert.equal(parseListViewMode("reports"), "overall")
  assert.equal(parseListViewMode("reports", { hasReports: false }), "overall")
})

test("keeps reports when at least one report exists", () => {
  assert.deepEqual(listViewModes({ hasReports: true }), [
    "overall",
    "workitems",
    "reports",
  ])
  assert.equal(parseListViewMode("reports", { hasReports: true }), "reports")
})

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
