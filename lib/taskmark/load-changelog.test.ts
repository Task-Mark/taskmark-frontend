import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { loadBoardChangelogMarkdown } from "./load-changelog"

function tempBoard(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-changelog-"))
}

test("returns markdown when CHANGELOG.md has content", () => {
  const dir = tempBoard()
  fs.writeFileSync(
    path.join(dir, "CHANGELOG.md"),
    "# Changelog\n\n## Unreleased\n\n- A button was added.\n"
  )
  const loaded = loadBoardChangelogMarkdown(dir)
  assert.ok(loaded)
  assert.match(loaded, /A button was added/)
})

test("treats missing CHANGELOG.md as absent", () => {
  assert.equal(loadBoardChangelogMarkdown(tempBoard()), null)
})

test("treats whitespace-only CHANGELOG.md as absent", () => {
  const dir = tempBoard()
  fs.writeFileSync(path.join(dir, "CHANGELOG.md"), "  \n\t\n")
  assert.equal(loadBoardChangelogMarkdown(dir), null)
})
