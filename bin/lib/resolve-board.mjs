import fs from "node:fs"
import path from "node:path"

function hasBoardMarkers(boardPath) {
  return (
    fs.existsSync(path.join(boardPath, "INDEX.md")) ||
    fs.existsSync(path.join(boardPath, "epics"))
  )
}

function isDedicatedBoardRepoName(name) {
  return name.endsWith("-taskmark")
}

/**
 * Resolve a Taskmark board directory from a path (product root, board root, or nested taskmark/).
 * @returns {string | null} absolute board path
 */
export function resolveBoardAtPath(candidatePath) {
  const resolved = path.resolve(candidatePath)
  let stat
  try {
    stat = fs.statSync(resolved)
  } catch {
    return null
  }
  if (!stat.isDirectory()) return null

  const base = path.basename(resolved)

  if (isDedicatedBoardRepoName(base) && hasBoardMarkers(resolved)) {
    return resolved
  }

  const nested = path.join(resolved, "taskmark")
  try {
    if (fs.statSync(nested).isDirectory() && hasBoardMarkers(nested)) {
      return nested
    }
  } catch {
    /* ignore */
  }

  if (hasBoardMarkers(resolved)) {
    return resolved
  }

  return null
}

/**
 * Multi-git layout: product repo beside a dedicated `<common>-taskmark` board.
 * Prefer `<parentDirBasename>-taskmark`, else a unique `*-taskmark` sibling,
 * else a sibling whose board prefix matches the product repo name.
 */
export function resolveSiblingDedicatedBoard(fromDir) {
  const resolved = path.resolve(fromDir)
  const parent = path.dirname(resolved)
  const parentName = path.basename(parent)
  const preferred = path.join(parent, `${parentName}-taskmark`)
  if (
    isDedicatedBoardRepoName(path.basename(preferred)) &&
    hasBoardMarkers(preferred)
  ) {
    return preferred
  }

  let entries
  try {
    entries = fs.readdirSync(parent, { withFileTypes: true })
  } catch {
    return null
  }

  const boards = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !isDedicatedBoardRepoName(entry.name)) continue
    const full = path.join(parent, entry.name)
    if (hasBoardMarkers(full)) boards.push(full)
  }
  if (boards.length === 0) return null
  if (boards.length === 1) return boards[0]

  const cwdBase = path.basename(resolved)
  const parts = cwdBase.split("-").filter(Boolean)
  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join("-")
    const hit = boards.find((b) => path.basename(b) === `${prefix}-taskmark`)
    if (hit) return hit
  }

  return null
}

function cwdCandidates() {
  const out = []
  const seen = new Set()
  for (const raw of [
    process.env.TASKMARK_CWD,
    process.env.INIT_CWD,
    process.cwd(),
  ]) {
    if (!raw || !String(raw).trim()) continue
    const resolved = path.resolve(String(raw).trim())
    try {
      const key = fs.realpathSync(resolved)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(key)
    } catch {
      if (seen.has(resolved)) continue
      seen.add(resolved)
      out.push(resolved)
    }
  }
  return out
}

/**
 * Same precedence as the Next app autoconfig:
 * TASKMARK_BOARD → TASKMARK_MASTER (as board-or-master) → cwd → sibling *-taskmark.
 * @returns {{ boardPath: string, source: string } | null}
 */
export function resolveServeBoard(explicitBoard) {
  if (explicitBoard) {
    const board = resolveBoardAtPath(explicitBoard)
    if (board) return { boardPath: board, source: "flag" }
    return null
  }

  const boardEnv = process.env.TASKMARK_BOARD?.trim()
  if (boardEnv) {
    const board = resolveBoardAtPath(boardEnv)
    if (board) return { boardPath: board, source: "env_board" }
  }

  const masterEnv = process.env.TASKMARK_MASTER?.trim()
  if (masterEnv) {
    const board = resolveBoardAtPath(masterEnv)
    if (board) return { boardPath: board, source: "env_master" }
    // Master may contain a nested board one level down — check common layouts only.
    const nested = resolveBoardAtPath(path.join(masterEnv, "taskmark"))
    if (nested) return { boardPath: nested, source: "env_master" }
  }

  for (const candidate of cwdCandidates()) {
    const board = resolveBoardAtPath(candidate)
    if (board) return { boardPath: board, source: "cwd" }
  }

  for (const candidate of cwdCandidates()) {
    const sibling = resolveSiblingDedicatedBoard(candidate)
    if (sibling) return { boardPath: sibling, source: "sibling" }
  }

  return null
}
