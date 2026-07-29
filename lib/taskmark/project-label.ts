import type { DiscoveredProject } from "@/lib/taskmark/types"

/** Label for dropdown; disambiguate when names collide (no filesystem paths). */
export function projectOptionLabel(
  project: DiscoveredProject,
  all: DiscoveredProject[]
): string {
  const sameName = all.filter((p) => p.name === project.name)
  if (sameName.length <= 1) return project.name
  const index = sameName.findIndex((p) => p.id === project.id) + 1
  return `${project.name} (${index})`
}
