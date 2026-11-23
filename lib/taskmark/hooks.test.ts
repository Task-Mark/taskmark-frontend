import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { HOOK_MARKER, installHooks, taskIdFromBranch } from "../../bin/lib/hooks.mjs"

const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Marco",
  GIT_AUTHOR_EMAIL: "marco@example.com",
  GIT_COMMITTER_NAME: "Marco",
  GIT_COMMITTER_EMAIL: "marco@example.com",
}

function git(repo: string, args: string[]): string {
  return execFileSync("git", ["-C", repo, ...args], { env: ENV, encoding: "utf8" })
}

test("taskIdFromBranch finds Taskmark ids in branch names", () => {
  assert.equal(taskIdFromBranch("feature/T-MM-457b0290-login"), "T-MM-457b0290")
  assert.equal(taskIdFromBranch("careers/s-086-endpoints"), "S-086")
  assert.equal(taskIdFromBranch("B-8"), "B-8")
  assert.equal(taskIdFromBranch("main"), null)
  assert.equal(taskIdFromBranch("release-2026"), null)
})

test("installed hooks add the task id to commits and leave foreign hooks alone", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-hooks-"))
  try {
    const repo = path.join(root, "app")
    fs.mkdirSync(repo)
    git(repo, ["init", "-q", "-b", "main"])
    const hooksDir = path.join(repo, ".git", "hooks")
    fs.mkdirSync(hooksDir, { recursive: true })
    fs.writeFileSync(path.join(hooksDir, "post-merge"), "#!/bin/sh\necho mine\n", { mode: 0o755 })

    const result = installHooks({ repo })
    assert.deepEqual(result.written, ["prepare-commit-msg"])
    assert.deepEqual(result.skipped, [])
    assert.deepEqual(result.removed, [], "a post-merge hook Taskmark did not write is kept")
    assert.equal(fs.readFileSync(path.join(hooksDir, "post-merge"), "utf8"), "#!/bin/sh\necho mine\n")
    assert.match(fs.readFileSync(path.join(hooksDir, "prepare-commit-msg"), "utf8"), new RegExp(HOOK_MARKER))

    git(repo, ["checkout", "-q", "-b", "feature/T-MM-457b0290-login"])
    fs.writeFileSync(path.join(repo, "a.txt"), "a\n")
    git(repo, ["add", "a.txt"])
    git(repo, ["commit", "-q", "-m", "rebuild the login page"])
    assert.match(git(repo, ["log", "-1", "--format=%B"]), /Task: T-MM-457b0290/)

    fs.writeFileSync(path.join(repo, "b.txt"), "b\n")
    git(repo, ["add", "b.txt"])
    git(repo, ["commit", "-q", "-m", "T-MM-457b0290 fix the picker"])
    assert.doesNotMatch(git(repo, ["log", "-1", "--format=%B"]), /Task:/)

    const again = installHooks({ repo })
    assert.deepEqual(again.written, ["prepare-commit-msg"])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("installing again removes the post-merge hook older versions wrote", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-hooks-old-"))
  try {
    const repo = path.join(root, "app")
    fs.mkdirSync(repo)
    git(repo, ["init", "-q", "-b", "main"])
    const hooksDir = path.join(repo, ".git", "hooks")
    fs.mkdirSync(hooksDir, { recursive: true })
    const old = path.join(hooksDir, "post-merge")
    fs.writeFileSync(old, `#!/bin/sh\n${HOOK_MARKER}\nnpx --no-install taskmark stages\n`, { mode: 0o755 })

    const result = installHooks({ repo })
    assert.deepEqual(result.removed, ["post-merge"])
    assert.equal(fs.existsSync(old), false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
