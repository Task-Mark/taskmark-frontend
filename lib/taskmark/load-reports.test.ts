import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { loadBoardReports } from "./load-reports"

function boardWithReports(files: Record<string, string>): string {
  const board = fs.mkdtempSync(path.join(os.tmpdir(), "tm-reports-"))
  const dir = path.join(board, ".reports")
  fs.mkdirSync(dir)
  for (const [name, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), contents, "utf8")
  }
  return board
}

test("returns no reports when the directory is missing", () => {
  const board = fs.mkdtempSync(path.join(os.tmpdir(), "tm-reports-"))
  assert.deepEqual(loadBoardReports(board), [])
})

test("returns no reports when the directory is empty", () => {
  assert.deepEqual(loadBoardReports(boardWithReports({})), [])
})

test("orders reports newest first with an ISO display date", () => {
  const board = boardWithReports({
    "report-20260820.md": "# Older\n",
    "report-20260831.md": "# Newer\n",
    "report-20260101.md": "# Oldest\n",
  })

  const reports = loadBoardReports(board)

  assert.deepEqual(
    reports.map((report) => report.id),
    ["20260831", "20260820", "20260101"]
  )
  assert.deepEqual(
    reports.map((report) => report.date),
    ["2026-08-31", "2026-08-20", "2026-01-01"]
  )
  assert.equal(reports[0]!.markdown, "# Newer\n")
})

test("ignores files that are not dated reports", () => {
  const board = boardWithReports({
    "report-20260831.md": "# Keep\n",
    "report-2026083.md": "# Too short\n",
    "report-20260831.txt": "# Wrong extension\n",
    "notes.md": "# Unrelated\n",
    "report-20261399.md": "# Impossible date\n",
    "report-20260230.md": "# Day outside the month\n",
  })

  assert.deepEqual(
    loadBoardReports(board).map((report) => report.id),
    ["20260831"]
  )
})

test("treats whitespace-only reports as absent", () => {
  const board = boardWithReports({
    "report-20260831.md": "   \n\n",
    "report-20260820.md": "# Real\n",
  })

  assert.deepEqual(
    loadBoardReports(board).map((report) => report.id),
    ["20260820"]
  )
})
