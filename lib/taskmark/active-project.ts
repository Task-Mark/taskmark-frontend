import type { DiscoveredProject } from "@/lib/taskmark/types"

/** Resolve which discovered project is active; fall back to the first. */
export function resolveActiveProject(
  projects: DiscoveredProject[],
  activeProjectId: string | null
): DiscoveredProject | null {
  if (projects.length === 0) return null
  if (activeProjectId) {
    const match = projects.find(
      (p) => p.id === activeProjectId || p.boardPath === activeProjectId
    )
    if (match) return match
  }
  return projects[0] ?? null
}
