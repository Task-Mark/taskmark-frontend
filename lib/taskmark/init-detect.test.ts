import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { boardKind, commonPrefix, detectProject } from "../../bin/lib/init-detect.mjs"

function tmp() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "taskmark-detect-")))
}

function repo(dir: string, remote?: string) {
  fs.mkdirSync(dir, { recursive: true })
  execFileSync("git", ["-C", dir, "init", "-q", "-b", "main"])
  if (remote) execFileSync("git", ["-C", dir, "remote", "add", "origin", remote])
  return dir
}

test("a single repo with no board proposes taskmark/ inside it", () => {
  const root = tmp()
  const api = repo(path.join(root, "shop"), "git@github.com:acme/shop.git")
  repo(path.join(root, "unrelated"), "git@github.com:acme/unrelated.git")
  const found = detectProject({ cwd: api })
  assert.equal(found.board, null)
  assert.equal(found.layout, "single")
  assert.deepEqual(found.repos.map((r) => r.name), ["shop"])
  assert.equal(found.proposedBoardPath, path.join(api, "taskmark"))
  assert.equal(found.projectName, "shop")
  assert.deepEqual(found.repos[0].remote, { provider: "github", owner: "acme", name: "shop" })
})

test("sibling repos sharing a prefix propose a dedicated <project>-taskmark", () => {
  const root = tmp()
  const api = repo(path.join(root, "shop-api"), "https://github.com/acme/shop-api.git")
  repo(path.join(root, "shop-web"), "git@bitbucket.org:acme/shop-web.git")
  repo(path.join(root, "other"))
  const found = detectProject({ cwd: api })
  assert.equal(found.layout, "multi")
  assert.deepEqual(found.repos.map((r) => r.name).sort(), ["shop-api", "shop-web"])
  assert.equal(found.candidates.length, 3)
  assert.equal(found.projectName, "shop")
  assert.equal(found.proposedBoardPath, path.join(root, "shop-taskmark"))
  assert.equal(found.repos.find((r) => r.name === "shop-web")?.remote?.provider, "bitbucket")
})

test("a project folder (not a repo) uses its child repos", () => {
  const root = tmp()
  const project = path.join(root, "acme")
  repo(path.join(project, "acme-api"))
  repo(path.join(project, "acme-web"))
  const found = detectProject({ cwd: project })
  assert.equal(found.layout, "multi")
  assert.equal(found.proposedBoardPath, path.join(project, "acme-taskmark"))
})

test("finds a legacy board and a 2.0 board", () => {
  const root = tmp()
  const api = repo(path.join(root, "shop"))
  fs.mkdirSync(path.join(api, "taskmark", "epics"), { recursive: true })
  let found = detectProject({ cwd: api })
  assert.equal(found.board?.path, path.join(api, "taskmark"))
  assert.equal(found.board?.kind, "legacy")

  fs.rmSync(path.join(api, "taskmark", "epics"), { recursive: true })
  fs.mkdirSync(path.join(api, "taskmark", "requests"))
  found = detectProject({ cwd: api })
  assert.equal(found.board?.kind, "requests")
  assert.equal(boardKind(path.join(root, "nope")), "none")
})

test("a dedicated sibling board lists its configured repos and is not a code repo", () => {
  const root = tmp()
  const board = repo(path.join(root, "shop-taskmark"), "git@github.com:acme/shop-taskmark.git")
  fs.mkdirSync(path.join(board, "requests"))
  fs.writeFileSync(path.join(board, "package.json"), JSON.stringify({ taskmark: { repos: ["../shop-api"] } }))
  repo(path.join(root, "shop-api"), "git@github.com:acme/shop-api.git")
  repo(path.join(root, "shop-web"), "git@github.com:acme/shop-web.git")
  const found = detectProject({ cwd: board })
  assert.equal(found.board?.path, board)
  assert.deepEqual(found.repos.map((r) => r.name), ["shop-api"])
  assert.ok(!found.candidates.some((r) => r.name === "shop-taskmark"))
  assert.ok(found.candidates.some((r) => r.name === "shop-web"))
  assert.equal(found.projectName, "shop")
})

test("commonPrefix works on dash segments", () => {
  assert.equal(commonPrefix(["shop-api", "shop-web"]), "shop")
  assert.equal(commonPrefix(["acme-shop-api", "acme-shop-web"]), "acme-shop")
  assert.equal(commonPrefix(["a", "b"]), "")
})
