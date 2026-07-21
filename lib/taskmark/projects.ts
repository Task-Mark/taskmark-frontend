import fs from "node:fs"
import path from "node:path"

import type { DiscoveredProject } from "@/lib/taskmark/types"

/** Dedicated multi-repo board folder names end with `-taskmark`. */
export function isDedicatedBoardRepoName(name: string): boolean {
  return name.endsWith("-taskmark")
}

/** Stable absolute identity for a board (dedupe key + cookie id). */
export function resolveBoardKey(boardPath: string): string {
  const resolved = path.resolve(boardPath)
  try {
    return fs.realpathSync(resolved)
  } catch {
    return resolved
  }
}

/**
 * Project root for a board path:
 * - nested `<project>/taskmark` → `<project>`
 * - flat dedicated `<name>-taskmark` → that folder itself
 */
export function projectPathForBoard(boardPath: string): string {
  const resolved = path.resolve(boardPath)
  const base = path.basename(resolved)
  if (isDedicatedBoardRepoName(base)) return resolved
  if (base === "taskmark") return path.dirname(resolved)
  return path.dirname(resolved)
}

export function projectNameForBoard(boardPath: string): string {
  return path.basename(projectPathForBoard(boardPath))
}

/** Collapse duplicate boards that resolve to the same path. */
export function dedupeProjects(
  projects: DiscoveredProject[]
): DiscoveredProject[] {
  const byKey = new Map<string, DiscoveredProject>()
  for (const project of projects) {
    const key = resolveBoardKey(project.boardPath)
    if (byKey.has(key)) continue
    byKey.set(key, {
      ...project,
      id: key,
      boardPath: key,
      projectPath: projectPathForBoard(key),
      name: projectNameForBoard(key),
    })
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name))
}
