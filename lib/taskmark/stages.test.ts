import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  mergeSourceBranch,
  setFrontmatterFields,
  syncStages,
} from "../../bin/lib/stages.mjs"
import { parseRequestsForProject } from "./parse-requests"

const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Marco Mendão",
  GIT_AUTHOR_EMAIL: "marco@example.com",
  GIT_COMMITTER_NAME: "Marco Mendão",
  GIT_COMMITTER_EMAIL: "marco@example.com",
}

function git(repo: string, args: string[], date?: string) {
  execFileSync("git", ["-C", repo, ...args], {
    env: date ? { ...ENV, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : ENV,
    stdio: "ignore",
  })
}

function commit(repo: string, file: string, message: string, date: string) {
  fs.writeFileSync(path.join(repo, file), `${message}\n`)
  git(repo, ["add", file], date)
  git(repo, ["commit", "-q", "-m", message], date)
}

function write(file: string, lines: string[]) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, lines.join("\n"))
}

/**
 * Code repo:
 * - T-1 committed on develop, promoted to quality, released to main
 * - S-2 feature branch (story id in the branch name) merged to develop only
 * - T-3 only on an unmerged feature branch
 */
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-stages-"))
  const repo = path.join(root, "app-api")
  fs.mkdirSync(repo)
  git(repo, ["init", "-q", "-b", "main"])
  commit(repo, "README.md", "initial commit", "2026-11-01T10:00:00Z")
  git(repo, ["branch", "develop"])
  git(repo, ["branch", "quality"])

  git(repo, ["checkout", "-q", "develop"])
  commit(repo, "model.txt", "T-1 careers data model", "2026-11-10T10:00:00Z")
  git(repo, ["checkout", "-q", "quality"])
  git(repo, ["merge", "-q", "--no-ff", "-m", "Merge branch 'develop' into quality", "develop"], "2026-11-12T10:00:00Z")
  git(repo, ["checkout", "-q", "main"])
  git(repo, ["merge", "-q", "--no-ff", "-m", "Merge branch 'quality'", "quality"], "2026-11-21T17:00:00Z")

  git(repo, ["checkout", "-q", "-b", "careers/S-2-endpoints", "develop"])
  commit(repo, "endpoints.txt", "public endpoints", "2026-11-22T10:00:00Z")
  git(repo, ["checkout", "-q", "develop"])
  git(repo, ["merge", "-q", "--no-ff", "-m", "Merge pull request #214 from marco/careers/S-2-endpoints", "careers/S-2-endpoints"], "2026-11-23T18:41:00Z")

  git(repo, ["checkout", "-q", "-b", "feature/T-3-copy", "develop"])
  commit(repo, "copy.txt", "careers copy in pt-PT", "2026-11-23T19:00:00Z")
  git(repo, ["checkout", "-q", "main"])

  const board = path.join(root, "app-taskmark")
  const req = path.join(board, "requests", "careers")
  write(path.join(req, "brief.md"), ["---", "id: R-careers", "title: Careers", "---", "## Goal", "Careers."])
  const story = path.join(req, "epics", "E-1-platform", "stories", "S-1-api")
  write(path.join(req, "epics", "E-1-platform", "epic.md"), ["---", "id: E-1", "type: epic", "title: Platform", "---", ""])
  write(path.join(story, "story.md"), ["---", "id: S-1", "type: story", "title: API", "---", ""])
  write(path.join(story, "items", "T-1.md"), ["---", "id: T-1", "type: task", "title: Model", "status: in_progress", "parent: S-1", "---", "", "## Commits", "", "| SHA | Repo | Date (UTC) | Author | Message |", "|-----|------|------------|--------|---------|", ""])
  const story2 = path.join(req, "epics", "E-1-platform", "stories", "S-2-endpoints")
  write(path.join(story2, "story.md"), ["---", "id: S-2", "type: story", "title: Endpoints", "---", ""])
  write(path.join(story2, "items", "T-2.md"), ["---", "id: T-2", "type: task", "title: List endpoint", "status: in_progress", "parent: S-2", "---", ""])
  write(path.join(story, "items", "T-3.md"), ["---", "id: T-3", "type: task", "title: Copy", "status: backlog", "parent: S-1", "---", ""])
  write(path.join(story, "items", "T-4.md"), ["---", "id: T-4", "type: task", "title: Untouched", "status: backlog", "parent: S-1", "---", ""])
  return { root, repo, board }
}

test("mergeSourceBranch reads GitHub, Bitbucket and git merge messages", () => {
  assert.equal(mergeSourceBranch("Merge pull request #214 from marco/careers/S-2-endpoints"), "careers/S-2-endpoints")
  assert.equal(mergeSourceBranch("Merged in feature/T-9 (pull request #31)"), "feature/T-9")
  assert.equal(mergeSourceBranch("Merge branch 'develop' into quality"), "develop")
  assert.equal(mergeSourceBranch("plain commit"), "")
})

test("setFrontmatterFields replaces or appends keys and keeps the rest", () => {
  const raw = "---\nid: T-1\nstage: development\n---\nBody\n"
  assert.equal(
    setFrontmatterFields(raw, { stage: "production", shipped_at: "2026-11-21T17:00:00Z" }),
    "---\nid: T-1\nstage: production\nshipped_at: 2026-11-21T17:00:00Z\n---\nBody\n"
  )
})

test("stages follow branches and only main counts as shipped", () => {
  const { root, repo, board } = setup()
  try {
    const result = syncStages({ boardPath: board, repos: [repo], since: "" })
    const read = (rel: string) =>
      fs.readFileSync(path.join(board, "requests", "careers", "epics", "E-1-platform", "stories", rel), "utf8")

    const t1 = read("S-1-api/items/T-1.md")
    assert.match(t1, /^stage: production$/m)
    assert.match(t1, /^shipped_at: 2026-11-21T17:00:00Z$/m)
    assert.match(t1, /\| app-api \| 2026-11-10T10:00:00Z \| Marco Mendão \| T-1 careers data model \|/)

    const t2 = read("S-2-endpoints/items/T-2.md")
    assert.match(t2, /^stage: development$/m)
    assert.doesNotMatch(t2, /shipped_at/)

    assert.match(read("S-1-api/items/T-3.md"), /^stage: development$/m)
    assert.doesNotMatch(read("S-1-api/items/T-4.md"), /stage:/)

    assert.deepEqual(result.stageCounts, { development: 2, testing: 0, production: 1 })
    const kinds = result.logFiles.map((f: string) => f.split("-").slice(2, 3)[0]).sort()
    assert.ok(kinds.includes("release"))
    assert.ok(kinds.includes("promote"))
    assert.ok(kinds.includes("merge"))

    const project = { id: board, name: "app", projectPath: board, boardPath: board }
    const list = parseRequestsForProject(project)
    const request = list.requests[0]
    assert.equal(request?.shippedLeafCount, 1)
    assert.equal(request?.stage, null)
    const release = list.logByRequest["R-careers"]?.find((e) => e.kind === "release")
    assert.equal(release?.toBranch, "main")
    assert.equal(release?.person?.name, "Marco Mendão")
    assert.deepEqual(release?.targets, ["T-1"])
    const merge = list.logByRequest["R-careers"]?.find((e) => e.kind === "merge")
    assert.equal(merge?.fromBranch, "careers/S-2-endpoints")
    assert.deepEqual(merge?.targets, ["T-2"])

    const again = syncStages({ boardPath: board, repos: [repo], since: "" })
    assert.equal(again.changes.length, 0)
    assert.equal(again.logFiles.length, 0)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
