import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { migrateBoard, slugify, stageDoneLeaf } from "../../bin/lib/migrate-board.mjs"
import { parseEpicsForProject } from "./parse-epics"
import { findRequest, parseRequestsForProject } from "./parse-requests"
import type { DiscoveredProject } from "./types"

function write(file: string, lines: string[]) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, lines.join("\n"))
}

function legacyBoard(): DiscoveredProject {
  const boardPath = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-migrate-"))
  const careers = path.join(boardPath, "epics", "E-MM-3ed0b601-careers-site")
  write(path.join(careers, "epic.md"), [
    "---",
    "id: E-MM-3ed0b601",
    "type: epic",
    "title: Careers site and job board",
    "status: in_progress",
    "reporters:",
    "  - name: Beatriz Ramos",
    "    email: beatriz@example.com",
    "created: 2026-11-16",
    "---",
    "",
    "# E-MM-3ed0b601: Careers site and job board",
    "",
    "## Goal",
    "",
    "Public careers page per client.",
    "",
    "## Out of scope",
    "",
    "- Custom domains",
    "",
    "## Success metrics",
    "",
    "- Candidates apply without an account",
  ])
  write(path.join(careers, "stories", "S-1-api", "story.md"), ["---", "id: S-1", "type: story", "title: API", "---", ""])
  write(path.join(careers, "stories", "S-1-api", "items", "T-1.md"), [
    "---",
    "id: T-1",
    "type: task",
    "title: Data model",
    "status: done",
    "parent: S-1",
    "epic: E-MM-3ed0b601",
    "size: S",
    "completed_at: 2026-11-21T17:00:00Z",
    "---",
    "",
    "## Work log",
    "",
    "| Actor | Started (UTC) | Ended (UTC) | Summary |",
    "|-------|---------------|-------------|---------|",
    "| Marco | 2026-11-21T16:00:00Z | 2026-11-21T17:00:00Z | Built it. |",
  ])
  write(path.join(careers, "stories", "S-1-api", "items", "T-2.md"),
    ["---", "id: T-2", "type: task", "title: Endpoints", "status: in_progress", "parent: S-1", "epic: E-MM-3ed0b601", "---", ""])
  write(path.join(boardPath, "epics", "E-001-general", "epic.md"),
    ["---", "id: E-001", "type: epic", "title: General", "---", ""])
  return { id: boardPath, name: "demo", projectPath: boardPath, boardPath }
}

test("slugify keeps readable ascii slugs", () => {
  assert.equal(slugify("Candidate profile as a dedicated page"), "candidate-profile-as-a-dedicated-page")
  assert.equal(slugify("Reuniões e notas"), "reunioes-e-notas")
})

test("stageDoneLeaf only stages done leaves without a stage", () => {
  assert.equal(stageDoneLeaf("---\nid: T-1\nstatus: in_progress\n---\n"), null)
  assert.equal(stageDoneLeaf("---\nid: T-1\nstatus: done\nstage: testing\n---\n"), null)
  const staged = stageDoneLeaf("---\nid: T-1\nstatus: done\ncompleted_at: 2026-11-21T17:00:00Z\n---\nBody\n")
  assert.equal(staged, "---\nid: T-1\nstatus: done\ncompleted_at: 2026-11-21T17:00:00Z\nstage: production\nshipped_at: 2026-11-21T17:00:00Z\n---\nBody\n")
})

test("dry run plans the migration without touching files", () => {
  const project = legacyBoard()
  try {
    const result = migrateBoard({ boardPath: project.boardPath, dryRun: true })
    assert.deepEqual(result.requests.map((r) => r.slug).sort(), ["careers-site-and-job-board", "maintenance"])
    assert.equal(result.stagedLeaves, 1)
    assert.ok(fs.existsSync(path.join(project.boardPath, "epics")))
    assert.ok(!fs.existsSync(path.join(project.boardPath, "requests")))
  } finally {
    fs.rmSync(project.boardPath, { recursive: true, force: true })
  }
})

test("migrate moves epics under requests and the board still reads", () => {
  const project = legacyBoard()
  try {
    const before = parseEpicsForProject(project).epics.map((e) => e.id).sort()
    const result = migrateBoard({
      boardPath: project.boardPath,
      now: new Date("2026-11-23T10:00:00Z"),
    })
    assert.equal(result.removedLegacyDir, true)
    assert.ok(!fs.existsSync(path.join(project.boardPath, "epics")))

    const after = parseEpicsForProject(project).epics.map((e) => e.id).sort()
    assert.deepEqual(after, before)

    const list = parseRequestsForProject(project)
    assert.equal(list.errors.length, 0)
    const careers = findRequest(list, "E-MM-3ed0b601")
    assert.ok(careers)
    assert.equal(careers.id, "R-careers-site-and-job-board")
    assert.equal(careers.status, "building")
    assert.equal(careers.goal, "Public careers page per client.")
    assert.deepEqual(careers.outOfScope, ["Custom domains"])
    assert.deepEqual(careers.doneWhen.map((d) => d.text), ["Candidates apply without an account"])
    assert.equal(careers.requestedBy[0]?.name, "Beatriz Ramos")
    assert.equal(careers.shippedLeafCount, 1)
    assert.equal(careers.stageCounts.production, 1)
    assert.equal(list.logByRequest[careers.id]?.[0]?.title, "Migrated from epic E-MM-3ed0b601")

    const maintenance = findRequest(list, "E-001")
    assert.equal(maintenance?.slug, "maintenance")
    assert.equal(maintenance?.title, "Maintenance")

    const leaf = fs.readFileSync(
      path.join(project.boardPath, "requests", "careers-site-and-job-board", "epics",
        "E-MM-3ed0b601-careers-site", "stories", "S-1-api", "items", "T-1.md"), "utf8")
    assert.match(leaf, /stage: production/)
    assert.match(leaf, /\| Marco \| 2026-11-21T16:00:00Z/)
  } finally {
    fs.rmSync(project.boardPath, { recursive: true, force: true })
  }
})

test("migrate on a board without legacy epics does nothing", () => {
  const boardPath = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-migrate-empty-"))
  try {
    assert.deepEqual(migrateBoard({ boardPath }), { requests: [], stagedLeaves: 0, removedLegacyDir: false })
  } finally {
    fs.rmSync(boardPath, { recursive: true, force: true })
  }
})
