import type { DiscoveredProject } from "@/lib/taskmark/types"

/** Label for dropdown; disambiguate when names collide. */
export function projectOptionLabel(
  project: DiscoveredProject,
  all: DiscoveredProject[]
): string {
  const sameName = all.filter((p) => p.name === project.name)
  if (sameName.length <= 1) return project.name
  return `${project.name} — ${project.projectPath}`
}
