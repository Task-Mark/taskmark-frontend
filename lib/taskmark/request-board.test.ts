import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  boardViewHref,
  forecastRequests,
  mondayOf,
  parseBoardView,
  shippedPace,
  weeklyShipped,
} from "@taskmark/components/board-model"

import { buildRequestBoard } from "./request-board"
import type { DiscoveredProject } from "./types"

function write(file: string, lines: string[]) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, lines.join("\n"))
}

function leaf(id: string, extra: string[]): string[] {
  return ["---", `id: ${id}`, "type: task", `title: Task ${id}`, ...extra, "---", ""]
}

function project(boardPath: string): DiscoveredProject {
  return { id: "p", name: "demo", projectPath: boardPath, boardPath } as DiscoveredProject
}

/** One building request with shipped, testing and open work, one legacy epic. */
function writeBoard(): string {
  const board = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-request-board-"))
  const req = path.join(board, "requests", "careers")
  write(path.join(req, "brief.md"), [
    "---", "id: R-careers", "title: Careers", "status: building", "forecast: 2026-12-18", "---",
    "## Goal", "A careers page.",
  ])
  const epic = path.join(req, "epics", "E-1-platform")
  write(path.join(epic, "epic.md"), ["---", "id: E-1", "type: epic", "title: Platform", "---", ""])
  const story = path.join(epic, "stories", "S-1-api")
  write(path.join(story, "story.md"), ["---", "id: S-1", "type: story", "title: API", "---", ""])
  // Four shipped weeks of 5 points each before the week of 2026-11-23.
  const shipped = ["2026-10-27", "2026-11-03", "2026-11-10", "2026-11-17"]
  shipped.forEach((day, i) =>
    write(path.join(story, "items", `T-${i + 1}.md`),
      leaf(`T-${i + 1}`, ["status: done", "points: 5", "parent: S-1", "epic: E-1", "stage: production", `shipped_at: ${day}T12:00:00Z`]))
  )
  write(path.join(story, "items", "T-5.md"),
    leaf("T-5", ["status: done", "points: 5", "parent: S-1", "epic: E-1", "stage: testing"]))
  write(path.join(epic, "items", "T-6.md"),
    leaf("T-6", ["status: backlog", "points: 5", "parent: E-1", "epic: E-1"]))

  const proposed = path.join(board, "requests", "bulk")
  write(path.join(proposed, "brief.md"), ["---", "id: R-bulk", "title: Bulk", "status: proposed", "---", ""])

  const legacy = path.join(board, "epics", "E-9-old")
  write(path.join(legacy, "epic.md"), ["---", "id: E-9", "type: epic", "title: Old", "---", ""])
  write(path.join(legacy, "items", "T-9.md"), leaf("T-9", ["status: done", "parent: E-9", "epic: E-9"]))
  return board
}

const AS_OF = new Date("2026-11-25T10:00:00Z")

test("buildRequestBoard returns null for a board without requests or meetings", () => {
  const board = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-request-board-empty-"))
  write(path.join(board, "epics", "E-1-x", "epic.md"), ["---", "id: E-1", "type: epic", "---", ""])
  assert.equal(buildRequestBoard(project(board), undefined, AS_OF), null)
})

test("buildRequestBoard builds the tree with stages and keeps epic-level tasks", () => {
  const data = buildRequestBoard(project(writeBoard()), undefined, AS_OF)
  assert.ok(data)
  assert.equal(data.asOf, "2026-11-25")
  assert.equal(data.legacyLeafCount, 1)
  const careers = data.requests.find((r) => r.id === "R-careers")
  assert.ok(careers)
  assert.equal(careers.briefPath, path.join("requests", "careers", "brief.md"))
  assert.match(careers.briefMarkdown, /A careers page/)
  assert.equal(careers.epics.length, 1)
  const [epic] = careers.epics
  assert.equal(epic.title, "Platform")
  assert.equal(epic.stage, null, "an untouched task holds the epic back")
  assert.deepEqual(epic.leaves.map((l) => l.id), ["T-6"])
  const [story] = epic.stories
  assert.equal(story.stage, "testing")
  assert.equal(story.leaves.length, 5)
  assert.equal(story.leaves[0].shippedAt, "2026-10-27T12:00:00Z")
})

test("pace counts only what reached main, in full weeks before today", () => {
  const data = buildRequestBoard(project(writeBoard()), undefined, AS_OF)!
  assert.equal(mondayOf("2026-11-25"), "2026-11-23")
  const weeks = weeklyShipped(data)
  assert.equal(weeks.at(-1)?.week, "2026-11-23")
  assert.equal(weeks.reduce((n, w) => n + w.points, 0), 20)
  const pace = shippedPace(data, 4)
  assert.equal(pace.pointsPerWeek, 5)
  assert.equal(pace.weeks.length, 4)
})

test("forecast queues building work first and leaves unsized requests undated", () => {
  const data = buildRequestBoard(project(writeBoard()), undefined, AS_OF)!
  const forecasts = forecastRequests(data, shippedPace(data, 4))
  const careers = forecasts.get("R-careers")!
  // T-5 (testing) and T-6 (backlog) are left: 10 points at 5 a week.
  assert.equal(careers.remainingPoints, 10)
  assert.equal(careers.likely, "2026-12-09")
  assert.equal(careers.committed, "2026-12-18")
  const bulk = forecasts.get("R-bulk")!
  assert.equal(bulk.likely, "")
})

test("request views only exist on request boards and links name their view", () => {
  assert.equal(parseBoardView(undefined, { hasRequestBoard: true }), "work")
  assert.equal(parseBoardView(undefined, {}), "overall")
  assert.equal(parseBoardView("roadmap", {}), "overall")
  assert.equal(parseBoardView("roadmap", { hasRequestBoard: true }), "roadmap")
  assert.equal(parseBoardView("workitems", { hasRequestBoard: true }), "workitems")
  assert.equal(boardViewHref({ view: "work", hasRequestBoard: true }), "/")
  assert.equal(
    boardViewHref({ view: "request", request: "R-1", item: "T-2", hasRequestBoard: true }),
    "/?view=request&request=R-1&item=T-2"
  )
})

test("an undated request is queued by when it would land on its own", () => {
  const board = writeBoard()
  const maint = path.join(board, "requests", "maintenance")
  write(path.join(maint, "brief.md"), ["---", "id: R-maint", "title: Maintenance", "status: building", "---", ""])
  const epic = path.join(maint, "epics", "E-2-bugs")
  write(path.join(epic, "epic.md"), ["---", "id: E-2", "type: epic", "title: Bugs", "---", ""])
  write(path.join(epic, "items", "B-1.md"),
    ["---", "id: B-1", "type: bug", "title: Bug", "status: backlog", "points: 5", "parent: E-2", "epic: E-2", "---", ""])
  const data = buildRequestBoard(project(board), undefined, AS_OF)!
  const forecasts = forecastRequests(data, shippedPace(data, 4))
  // 5 points at 5 a week lands Dec 2, before the careers promise of Dec 18.
  assert.equal(forecasts.get("R-maint")!.likely, "2026-12-02")
  assert.equal(forecasts.get("R-careers")!.likely, "2026-12-16")
})

test("a brief with status backlog reads as ready", () => {
  const board = writeBoard()
  write(path.join(board, "requests", "csv", "brief.md"), ["---", "id: R-csv", "title: CSV", "status: Backlog", "---", ""])
  const data = buildRequestBoard(project(board), undefined, AS_OF)!
  assert.equal(data.requests.find((r) => r.id === "R-csv")?.status, "ready")
})
