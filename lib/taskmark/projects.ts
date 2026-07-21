import fs from "node:fs"
import path from "node:path"

import type { DiscoveredProject } from "@/lib/taskmark/types"

/** Stable absolute identity for a board (dedupe key + cookie id). */
export function resolveBoardKey(boardPath: string): string {
  const resolved = path.resolve(boardPath)
  try {
    return fs.realpathSync(resolved)
  } catch {
    return resolved
  }
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
      projectPath: path.dirname(key),
      name: path.basename(path.dirname(key)),
    })
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name))
}
