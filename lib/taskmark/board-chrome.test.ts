import assert from "node:assert/strict"
import test from "node:test"

import {
  FLOATING_CHROME_COLLAPSED_DEFAULT,
  FLOATING_CHROME_PULSE_MS,
  listEmptyKind,
  parseFloatingChromeCollapsedCookie,
  WORK_ACTIVITY_MAX_VISIBLE,
  WORK_PRESENCE_MAX_VISIBLE,
  worklogEntriesToActivityEvents,
} from "@taskmark/components/board-model"
import type { WorklogEntry } from "@taskmark/components/board-model/worklog"

test("treats hide-completed with no remaining rows as caught up", () => {
  assert.equal(
    listEmptyKind({
      hasSourceRows: true,
      visibleCount: 0,
      hideCompleted: true,
    }),
    "caught-up"
  )
})

test("keeps filter-mismatch copy when search hides remaining work", () => {
  assert.equal(
    listEmptyKind({
      hasSourceRows: true,
      visibleCount: 0,
      hideCompleted: true,
      query: "search",
    }),
    "filtered"
  )
})

test("keeps the source empty copy when the board has no rows", () => {
  assert.equal(
    listEmptyKind({
      hasSourceRows: false,
      visibleCount: 0,
      hideCompleted: true,
    }),
    "source"
  )
})

test("caps visible worklog and presence feeds at three", () => {
  assert.equal(WORK_ACTIVITY_MAX_VISIBLE, 3)
  assert.equal(WORK_PRESENCE_MAX_VISIBLE, 3)
})

test("keeps collapsed chrome open for ten seconds after a new worklog or summary", () => {
  assert.equal(FLOATING_CHROME_PULSE_MS, 10_000)
})

test("minimizes floating chrome until the user explicitly expands it", () => {
  assert.equal(FLOATING_CHROME_COLLAPSED_DEFAULT, true)
  assert.equal(parseFloatingChromeCollapsedCookie(undefined), true)
  assert.equal(parseFloatingChromeCollapsedCookie(null), true)
  assert.equal(parseFloatingChromeCollapsedCookie(""), true)
  assert.equal(parseFloatingChromeCollapsedCookie("1"), true)
  assert.equal(parseFloatingChromeCollapsedCookie("0"), false)
  assert.equal(parseFloatingChromeCollapsedCookie("false"), false)
})

test("maps worklog entries into feed events oldest first", () => {
  const entries = [
    {
      key: "new",
      actor: "Ada",
      itemId: "T-2",
      itemTitle: "Newer",
      itemType: "task",
      filePath: "t-2.md",
      summary: "Shipped the newer leaf",
      started: "2026-09-15T12:00:00Z",
      ended: "2026-09-15T12:10:00Z",
      session: "1",
    },
    {
      key: "old",
      actor: "Ada",
      itemId: "T-1",
      itemTitle: "Older",
      itemType: "task",
      filePath: "t-1.md",
      summary: "Started the older leaf",
      started: "2026-09-14T12:00:00Z",
      ended: "2026-09-14T12:10:00Z",
      session: "1",
    },
  ] as WorklogEntry[]

  const events = worklogEntriesToActivityEvents(entries)
  assert.equal(events[0]?.id, "old")
  assert.equal(events[1]?.id, "new")
  assert.equal(events[1]?.receivedAt, "2026-09-15T12:10:00Z")
})
