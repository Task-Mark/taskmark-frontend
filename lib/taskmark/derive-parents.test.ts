import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { deriveParentRollup, deriveParentStatus } from "./derive-parents"

test("rolls all shelved descendants up to shelved", () => {
  assert.equal(deriveParentStatus(["shelved", "shelved"]), "shelved")
})

test("rolls a terminal mix containing done up to done", () => {
  assert.equal(
    deriveParentStatus(["shelved", "cancelled", "done"]),
    "done"
  )
})

test("rolls shelved and cancelled without done up to shelved", () => {
  assert.equal(deriveParentStatus(["shelved", "cancelled"]), "shelved")
})

test("keeps a parent in progress while any descendant is open", () => {
  assert.equal(deriveParentStatus(["shelved", "backlog"]), "in_progress")
})

function writeBoard(): string {
  const boardPath = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-board-"))
  const storyDir = path.join(boardPath, "epics", "E-001-demo", "stories", "S-001-solo")
  fs.mkdirSync(storyDir, { recursive: true })
  fs.writeFileSync(
    path.join(boardPath, "epics", "E-001-demo", "epic.md"),
    "---\nid: E-001\ntype: epic\ntitle: Demo\nstatus: done\n---\n"
  )
  fs.writeFileSync(
    path.join(storyDir, "story.md"),
    [
      "---",
      "id: S-001",
      "type: story",
      "title: Solo story",
      "status: done",
      "size: M",
      "points: 3",
      "completed_at: 2026-07-23T10:15:03Z",
      "---",
      "",
    ].join("\n")
  )
  return boardPath
}

test("a childless story keeps its own status instead of rolling up to backlog", () => {
  const boardPath = writeBoard()
  try {
    const rollup = deriveParentRollup(
      boardPath,
      "S-001",
      "story",
      undefined,
      false,
      {
        status: "done",
        size: "M",
        points: 3,
        completed_at: "2026-07-23T10:15:03Z",
      }
    )
    assert.equal(rollup.status, "done")
    assert.equal(rollup.size, "M")
    assert.equal(rollup.points, 3)
    assert.equal(rollup.completedAt, "2026-07-23T10:15:03Z")
    assert.equal(rollup.leafCount, 0)
  } finally {
    fs.rmSync(boardPath, { recursive: true, force: true })
  }
})

test("without own frontmatter a childless parent still rolls up to backlog", () => {
  const boardPath = writeBoard()
  try {
    const rollup = deriveParentRollup(boardPath, "S-001", "story")
    assert.equal(rollup.status, "backlog")
    assert.equal(rollup.leafCount, 0)
  } finally {
    fs.rmSync(boardPath, { recursive: true, force: true })
  }
})
