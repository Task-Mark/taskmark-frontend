import fs from "node:fs"
import path from "node:path"

import {
  DISCOVERY_MAX_DEPTH,
  DISCOVERY_SKIP_DIR_NAMES,
} from "@/lib/taskmark/constants"
import type { DiscoveredProject } from "@/lib/taskmark/types"

function isTaskmarkBoard(candidateProjectRoot: string): boolean {
  const boardPath = path.join(candidateProjectRoot, "taskmark")
  try {
    if (!fs.statSync(boardPath).isDirectory()) return false
  } catch {
    return false
  }

  return (
    fs.existsSync(path.join(boardPath, "INDEX.md")) ||
    fs.existsSync(path.join(boardPath, "epics"))
  )
}

function toDiscoveredProject(projectPath: string): DiscoveredProject {
  const name = path.basename(projectPath)
  return {
    id: name,
    name,
    projectPath,
    boardPath: path.join(projectPath, "taskmark"),
  }
}

function shouldSkipDir(name: string): boolean {
  if (DISCOVERY_SKIP_DIR_NAMES.has(name)) return true
  // Skip other dot-directories; still allow scanning normal folders.
  if (name.startsWith(".")) return true
  return false
}

/**
 * Walk a master folder and find Taskmark boards in subfolders.
 * A project is any directory that contains a `taskmark/` board
 * (with INDEX.md and/or epics/). Does not require a board at the master root,
 * but will include the master itself if it has one.
 */
export function discoverTaskmarkProjects(
  masterPath: string,
  maxDepth = DISCOVERY_MAX_DEPTH
): DiscoveredProject[] {
  const root = path.resolve(masterPath)
  const found = new Map<string, DiscoveredProject>()

  function visit(dir: string, depth: number) {
    if (isTaskmarkBoard(dir)) {
      const project = toDiscoveredProject(dir)
      found.set(project.boardPath, project)
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
      // Never treat the board folder itself as a walk root for nested projects.
      if (entry.name === "taskmark") continue
      visit(path.join(dir, entry.name), depth + 1)
    }
  }

  visit(root, 0)

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}
