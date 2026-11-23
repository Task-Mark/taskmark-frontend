/**
 * What `taskmark init` finds before it asks anything: the board (legacy
 * `epics/`, 2.0 `requests/`, or none), the code repositories (one, or several
 * sibling repositories), and where a new board should go.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import { parseGitRemote } from "./app-connect.mjs"
import { resolveBoardAtPath, resolveSiblingDedicatedBoard } from "./resolve-board.mjs"
import { resolveRepos } from "./stages.mjs"

const BOARD_SUFFIX = "-taskmark"

function tryGit(dir, args) {
  try {
    return execFileSync("git", ["-C", dir, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return null
  }
}

function realpath(p) {
  try {
    return fs.realpathSync(p)
  } catch {
    return path.resolve(p)
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

/** "legacy" when an `epics/` folder is still there, "requests" for a 2.0 board, else "none". */
export function boardKind(boardPath) {
  if (!boardPath) return "none"
  if (isDir(path.join(boardPath, "epics"))) return "legacy"
  if (isDir(path.join(boardPath, "requests"))) return "requests"
  return "none"
}

/** The top of the git repository holding `dir`, or null. */
export function gitTopLevel(dir) {
  const top = tryGit(dir, ["rev-parse", "--show-toplevel"])
  return top ? realpath(top) : null
}

/** A local clone with its origin parsed (GitHub / Bitbucket), or remote null. */
export function describeRepo(repoPath) {
  const url = tryGit(repoPath, ["remote", "get-url", "origin"])
  return {
    path: realpath(repoPath),
    name: path.basename(repoPath),
    remoteUrl: url,
    remote: url ? parseGitRemote(url) : null,
  }
}

function isBoardDir(dir) {
  return path.basename(dir).endsWith(BOARD_SUFFIX)
}

/** Child folders of `dir` that are git repositories (not boards), sorted by name. */
export function childRepos(dir) {
  let entries = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => path.join(dir, e.name))
    .filter((full) => fs.existsSync(path.join(full, ".git")) && !isBoardDir(full))
    .map(realpath)
    .sort()
}

/** Leading dash-separated segments two names share ("shop-api", "shop-web" → "shop"). */
export function commonPrefix(names) {
  if (!names.length) return ""
  const split = names.map((n) => n.split("-"))
  const out = []
  for (let i = 0; i < split[0].length; i++) {
    const part = split[0][i]
    if (split.every((s) => s[i] === part)) out.push(part)
    else break
  }
  return out.join("-")
}

function relatedTo(anchorName, parentName) {
  const prefixes = new Set()
  if (anchorName.endsWith(BOARD_SUFFIX)) prefixes.add(anchorName.slice(0, -BOARD_SUFFIX.length))
  else if (anchorName.includes("-")) prefixes.add(anchorName.split("-")[0])
  if (parentName) prefixes.add(parentName)
  return (name) => [...prefixes].some((p) => p && (name === p || name.startsWith(`${p}-`)))
}

/** A dedicated `*-taskmark` board directly inside `dir` (a project folder). */
function childBoard(dir) {
  for (const repo of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!repo.endsWith(BOARD_SUFFIX)) continue
    const board = resolveBoardAtPath(path.join(dir, repo))
    if (board) return board
  }
  return null
}

function findBoard(cwd, explicit) {
  if (explicit) {
    const resolved = path.resolve(cwd, explicit)
    return resolveBoardAtPath(resolved) ?? resolved
  }
  const here = resolveBoardAtPath(cwd)
  if (here) return here
  const top = gitTopLevel(cwd)
  if (top) {
    const inRepo = resolveBoardAtPath(top)
    if (inRepo) return inRepo
    const sibling = resolveSiblingDedicatedBoard(top)
    if (sibling) return sibling
    return null
  }
  return childBoard(cwd)
}

/**
 * @param {{ cwd: string, board?: string | null }} options
 * @returns {{
 *   cwd: string,
 *   board: { path: string, kind: "legacy" | "requests" | "none", exists: boolean } | null,
 *   repos: ReturnType<typeof describeRepo>[],
 *   candidates: ReturnType<typeof describeRepo>[],
 *   layout: "single" | "multi",
 *   projectName: string,
 *   proposedBoardPath: string,
 * }}
 */
export function detectProject({ cwd, board: explicitBoard = null }) {
  const root = realpath(cwd)
  const boardPath = findBoard(root, explicitBoard)
  const board = boardPath
    ? { path: realpath(boardPath), kind: boardKind(boardPath), exists: isDir(boardPath) }
    : null

  const top = gitTopLevel(root)
  // The repository that holds a dedicated board is not a code repo.
  const boardTop = board?.exists ? gitTopLevel(board.path) : null
  const anchor = top && !(boardTop && top === boardTop && isBoardDir(top)) ? top : null

  let candidates = []
  let related = []
  if (top) {
    const parent = path.dirname(top)
    const siblings = childRepos(parent).filter((r) => r !== boardTop || !isBoardDir(r))
    const isRelated = relatedTo(path.basename(top), path.basename(parent))
    candidates = siblings
    related = siblings.filter((r) => r === anchor || isRelated(path.basename(r)))
    if (anchor && !related.includes(anchor)) related.unshift(anchor)
    if (anchor && !candidates.includes(anchor)) candidates.unshift(anchor)
  } else {
    candidates = childRepos(root)
    related = candidates
  }

  if (board?.exists) {
    const configured = resolveRepos(board.path).map(realpath)
    if (configured.length) {
      related = configured
      candidates = [...new Set([...configured, ...candidates])]
    }
  }
  if (boardTop) {
    related = related.filter((r) => r !== boardTop || !isBoardDir(r))
    candidates = candidates.filter((r) => r !== boardTop || !isBoardDir(r))
  }

  const layout = related.length > 1 ? "multi" : "single"
  const names = related.map((r) => path.basename(r))
  let projectName
  if (board?.exists && isBoardDir(board.path)) {
    projectName = path.basename(board.path).slice(0, -BOARD_SUFFIX.length)
  } else if (layout === "multi") {
    projectName = commonPrefix(names) || path.basename(top ? path.dirname(top) : root)
  } else {
    projectName = names[0] ?? path.basename(root)
  }

  let proposedBoardPath
  if (board) proposedBoardPath = board.path
  else if (layout === "multi") {
    const parent = top ? path.dirname(top) : root
    proposedBoardPath = path.join(parent, `${projectName}${BOARD_SUFFIX}`)
  } else if (related[0]) {
    proposedBoardPath = path.join(related[0], "taskmark")
  } else {
    proposedBoardPath = path.join(root, "taskmark")
  }

  return {
    cwd: root,
    board,
    repos: related.map(describeRepo),
    candidates: candidates.map(describeRepo),
    layout,
    projectName,
    proposedBoardPath,
  }
}

/** True when a board at `boardPath` lives in its own repository (not inside a code repo). */
export function isDedicatedBoardPath(boardPath) {
  return isBoardDir(boardPath)
}
