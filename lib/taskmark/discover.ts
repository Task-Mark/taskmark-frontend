import fs from "node:fs"
import path from "node:path"

import {
  DISCOVERY_MAX_DEPTH,
  DISCOVERY_SKIP_DIR_NAMES,
} from "@/lib/taskmark/constants"
import {
  isDedicatedBoardRepoName,
  projectNameForBoard,
  projectPathForBoard,
  resolveBoardKey,
} from "@/lib/taskmark/projects"
import type { DiscoveredProject } from "@/lib/taskmark/types"

function hasBoardMarkers(boardPath: string): boolean {
  return (
    fs.existsSync(path.join(boardPath, "INDEX.md")) ||
    fs.existsSync(path.join(boardPath, "epics"))
  )
}

/** Single-project layout: `<project>/taskmark/` with INDEX.md or epics/. */
function nestedBoardPath(candidateProjectRoot: string): string | null {
  const boardPath = path.join(candidateProjectRoot, "taskmark")
  try {
    if (!fs.statSync(boardPath).isDirectory()) return null
  } catch {
    return null
  }
  return hasBoardMarkers(boardPath) ? boardPath : null
}

/**
 * Multi-project layout: dedicated `<name>-taskmark` repo whose root is the board
 * (INDEX.md / epics/ at the folder root — no nested taskmark/).
 */
function flatBoardPath(candidateRoot: string): string | null {
  if (!isDedicatedBoardRepoName(path.basename(candidateRoot))) return null
  try {
    if (!fs.statSync(candidateRoot).isDirectory()) return null
  } catch {
    return null
  }
  return hasBoardMarkers(candidateRoot) ? candidateRoot : null
}

function resolveDiscoveredBoard(candidateRoot: string): string | null {
  return flatBoardPath(candidateRoot) ?? nestedBoardPath(candidateRoot)
}

function toDiscoveredProject(boardPath: string): DiscoveredProject {
  const key = resolveBoardKey(boardPath)
  return {
    id: key,
    name: projectNameForBoard(key),
    projectPath: projectPathForBoard(key),
    boardPath: key,
  }
}

function shouldSkipDir(name: string): boolean {
  if (DISCOVERY_SKIP_DIR_NAMES.has(name)) return true
  if (name.startsWith(".")) return true
  return false
}

/**
 * Walk a master folder and find Taskmark boards in subfolders.
 *
 * Recognizes:
 * - Single-project: any directory with a nested `taskmark/` board (INDEX.md or epics/)
 * - Multi-project: dedicated `*-taskmark` folders with board files at the repo root
 *
 * Does not require a board at the master root, but includes the master itself if it
 * matches either layout. Dedupes by realpath of the board directory.
 */
export function discoverTaskmarkProjects(
  masterPath: string,
  maxDepth = DISCOVERY_MAX_DEPTH
): DiscoveredProject[] {
  const root = path.resolve(masterPath)
  const found = new Map<string, DiscoveredProject>()

  function visit(dir: string, depth: number) {
    const board = resolveDiscoveredBoard(dir)
    if (board) {
      const project = toDiscoveredProject(board)
      found.set(project.id, project)
      // Do not descend into a project's internals looking for nested boards.
      return
    }

    if (depth >= maxDepth) return

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (shouldSkipDir(entry.name)) continue
      if (entry.name === "taskmark") continue
      visit(path.join(dir, entry.name), depth + 1)
    }
  }

  visit(root, 0)

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Discover across many master folders and dedupe identical boards. */
export function discoverTaskmarkProjectsFromMasters(
  masterPaths: string[]
): DiscoveredProject[] {
  const found = new Map<string, DiscoveredProject>()
  for (const master of masterPaths) {
    for (const project of discoverTaskmarkProjects(master)) {
      found.set(project.id, project)
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}
