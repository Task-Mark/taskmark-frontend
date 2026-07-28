import { resolveAutoconfigWorkspace } from "@/lib/taskmark/autoconfig"
import { discoverTaskmarkProjectsFromMasters } from "@/lib/taskmark/discover"
import { validateMasterFolder } from "@/lib/taskmark/validate"
import type { DiscoveredProject } from "@/lib/taskmark/types"

export type ConfiguredWorkspace = {
  masters: string[]
  projects: DiscoveredProject[]
  /** How the workspace was resolved; null means cookie/manual masters. */
  source: "env_board" | "env_master" | "cwd" | "cookies" | null
  /** When true, UI is locked to the auto-bound board(s) (skip setup). */
  autoconfig: boolean
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
  return {
    masters: validMasters,
    projects,
    source: "cookies",
    autoconfig: false,
  }
}

/**
 * Prefer env/cwd auto-config over cookies when present (T-152).
 * Falls back to cookie masters for the setup-wizard multi-master flow.
 */
export function loadWorkspace(cookieMasters: string[]): ConfiguredWorkspace {
  const auto = resolveAutoconfigWorkspace()
  if (auto && auto.projects.length > 0) {
    return {
      masters: auto.masters,
      projects: auto.projects,
      source: auto.source,
      autoconfig: true,
    }
  }
  return loadConfiguredWorkspace(cookieMasters)
}
