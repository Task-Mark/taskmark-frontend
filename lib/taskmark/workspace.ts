import { discoverTaskmarkProjectsFromMasters } from "@/lib/taskmark/discover"
import { validateMasterFolder } from "@/lib/taskmark/validate"
import type { DiscoveredProject } from "@/lib/taskmark/types"

export type ConfiguredWorkspace = {
  masters: string[]
  projects: DiscoveredProject[]
}

/**
 * Re-discover projects from every saved master folder and merge/dedupe.
 * Drops masters that no longer yield any boards.
 */
export function loadConfiguredWorkspace(
  masters: string[]
): ConfiguredWorkspace {
  const validMasters: string[] = []
  for (const master of masters) {
    const result = validateMasterFolder(master)
    if (result.ok) {
      validMasters.push(result.masterPath)
    }
  }
  const projects = discoverTaskmarkProjectsFromMasters(validMasters)
  return { masters: validMasters, projects }
}
