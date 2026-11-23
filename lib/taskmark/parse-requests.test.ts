import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { parseEpicsForProject } from "./parse-epics"
import { parseItemsForStory } from "./parse-items"
import { parseMeetingsForProject } from "./parse-meetings"
import { findRequest, parseRequestsForProject } from "./parse-requests"
import { parseStoriesForEpic } from "./parse-stories"
import { findWorkItemOnBoard } from "./resolve-work-item"
import type { DiscoveredProject } from "./types"

function write(file: string, lines: string[]) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, lines.join("\n"))
}

function leaf(id: string, extra: string[]): string[] {
  return ["---", `id: ${id}`, "type: task", `title: Task ${id}`, "size: S", ...extra, "---", ""]
}

/** A board half-way through migration: one request plus one legacy epic. */
function writeBoard(): DiscoveredProject {
  const boardPath = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-requests-"))
  const req = path.join(boardPath, "requests", "careers-site")
  write(path.join(req, "brief.md"), [
    "---",
    "id: R-careers-site",
    "type: request",
    "title: Careers site and job board",
    "requested_by:",
    "  - name: Beatriz Ramos",
    "    email: beatriz@example.com",
    "owner:",
    "  - name: Marco Mendão",
    "forecast: 2026-12-18",
    "aliases: [E-MM-3ed0b601]",
    "links:",
    "  - request: R-custom-domain",
    "    relation: waits-for",
    "---",
    "# Careers site and job board",
    "",
    "## Goal",
    "Each client gets a public careers page.",
    "",
    "## Done when",
    "- [x] A candidate finds an offer",
    "- [ ] They apply without an account",
    "",
    "## Out of scope",
    "- Custom domains",
    "",
    "## Open questions",
    "- [ ] Not found or closed?",
  ])
  const epic = path.join(req, "epics", "E-001-platform")
  write(path.join(epic, "epic.md"), ["---", "id: E-001", "type: epic", "title: Platform", "---", ""])
  const story = path.join(epic, "stories", "S-002-api")
  write(path.join(story, "story.md"), ["---", "id: S-002", "type: story", "title: API foundation", "---", ""])
  write(path.join(story, "items", "T-014-model.md"),
    leaf("T-014", ["status: done", "parent: S-002", "epic: E-001", "stage: production", "shipped_at: 2026-11-21T17:00:00Z"]))
  write(path.join(story, "items", "T-015-endpoints.md"),
    leaf("T-015", ["status: in_progress", "parent: S-002", "epic: E-001", "stage: quality"]))
  write(path.join(req, "log", "2026-11-23-1841-pr-214.md"), [
    "---",
    "kind: merge",
    "at: 2026-11-23T18:41:00Z",
    "person: { name: Marco Mendão, email: marco@example.com }",
    "repo: vectorhire-api",
    "provider: github",
    "from: careers-site/02",
    "to: develop",
    "shas: [a1b2c3d]",
    "targets: [T-014]",
    "title: Careers entities",
    "---",
    "Data model and migrations.",
  ])
  write(path.join(boardPath, "epics", "E-009-legacy", "epic.md"),
    ["---", "id: E-009", "type: epic", "title: Legacy epic", "---", ""])
  write(path.join(boardPath, "epics", "E-009-legacy", "items", "T-090.md"), leaf("T-090", ["status: backlog", "epic: E-009"]))
  write(path.join(boardPath, "meetings", "2026-11-20-weekly.md"), [
    "---",
    "id: M-2026-11-20-weekly",
    "title: Weekly with Beatriz",
    "date: 2026-11-20",
    "duration_minutes: 42",
    "people:",
    "  - name: Beatriz Ramos",
    "requests:",
    "  - id: R-careers-site",
    "    relation: changed",
    "  - R-bulk-reject",
    "---",
    "## Summary",
    "Answered the publish window question.",
    "",
    "## Decisions",
    "| Decision | Request |",
    "| --- | --- |",
    "| Closed offers show a page | R-careers-site |",
    "",
    "## Tasks",
    "| ID | Task | Owner | Due | Request | Item | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    "| M-07 | Closed offers page | Marco | — | R-careers-site | T-015 | in progress |",
    "| M-08 | Send the logo | Beatriz | 2026-11-27 | — | — | open |",
  ])
  return { id: boardPath, name: "demo", projectPath: boardPath, boardPath }
}

test("epics are found both under requests/ and legacy epics/", () => {
  const project = writeBoard()
  try {
    const ids = parseEpicsForProject(project).epics.map((e) => e.id).sort()
    assert.deepEqual(ids, ["E-001", "E-009"])
    const stories = parseStoriesForEpic(project, "E-001")
    assert.deepEqual(stories.stories.map((s) => s.id), ["S-002"])
    const items = parseItemsForStory(project, "E-001", "S-002")
    assert.deepEqual(items.items.map((i) => i.id).sort(), ["T-014", "T-015"])
    assert.ok(findWorkItemOnBoard(project.boardPath, "T-015"))
  } finally {
    fs.rmSync(project.boardPath, { recursive: true, force: true })
  }
})

test("a request reads its brief and rolls up stages from its tasks", () => {
  const project = writeBoard()
  try {
    const list = parseRequestsForProject(project)
    assert.equal(list.errors.length, 0)
    const request = findRequest(list, "E-MM-3ed0b601")
    assert.ok(request)
    assert.equal(request.id, "R-careers-site")
    assert.equal(request.status, "building")
    assert.equal(request.goal, "Each client gets a public careers page.")
    assert.deepEqual(request.doneWhen.map((d) => d.checked), [true, false])
    assert.deepEqual(request.outOfScope, ["Custom domains"])
    assert.equal(request.openQuestions.length, 1)
    assert.deepEqual(request.epicIds, ["E-001"])
    assert.equal(request.leafCount, 2)
    assert.equal(request.shippedLeafCount, 1)
    assert.equal(request.points, 6)
    assert.equal(request.shippedPoints, 3)
    assert.equal(request.stage, "testing")
    assert.deepEqual(request.stageCounts, { none: 0, development: 0, testing: 1, production: 1 })
    assert.deepEqual(request.links, [{ request: "R-custom-domain", relation: "waits-for" }])
    assert.equal(request.requestedBy[0]?.name, "Beatriz Ramos")

    const log = list.logByRequest["R-careers-site"]
    assert.equal(log?.length, 1)
    assert.equal(log?.[0]?.kind, "merge")
    assert.equal(log?.[0]?.person?.name, "Marco Mendão")
    assert.equal(log?.[0]?.toBranch, "develop")
    assert.deepEqual(log?.[0]?.targets, ["T-014"])
  } finally {
    fs.rmSync(project.boardPath, { recursive: true, force: true })
  }
})

test("meetings keep decisions, tasks and the stage of linked tasks", () => {
  const project = writeBoard()
  try {
    const { meetings, errors } = parseMeetingsForProject(project)
    assert.equal(errors.length, 0)
    assert.equal(meetings.length, 1)
    const meeting = meetings[0]
    assert.equal(meeting.title, "Weekly with Beatriz")
    assert.deepEqual(meeting.requests, [
      { request: "R-careers-site", relation: "changed" },
      { request: "R-bulk-reject", relation: "discussed" },
    ])
    assert.deepEqual(meeting.decisions, [{ text: "Closed offers show a page", request: "R-careers-site" }])
    assert.equal(meeting.tasks.length, 2)
    assert.equal(meeting.tasks[0]?.status, "in_progress")
    assert.equal(meeting.tasks[0]?.stage, "testing")
    assert.equal(meeting.tasks[1]?.request, "")
    assert.equal(meeting.tasks[1]?.due, "2026-11-27")
  } finally {
    fs.rmSync(project.boardPath, { recursive: true, force: true })
  }
})
