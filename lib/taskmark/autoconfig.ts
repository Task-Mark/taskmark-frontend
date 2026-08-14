import fs from "node:fs"
import path from "node:path"

import {
  resolveBoardAtPath,
  toDiscoveredProject,
  discoverTaskmarkProjects,
} from "@/lib/taskmark/discover"
import type { DiscoveredProject } from "@/lib/taskmark/types"
import { isWorkspaceMode } from "@/lib/taskmark/workspace-mode"

export type AutoconfigSource =
  | "env_board"
  | "env_master"
  | "cwd"
  | "sibling"

export type AutoconfigWorkspace = {
  source: AutoconfigSource
  /** True when the project list is locked to one board (env board or cwd). */
  singleProject: boolean
  masters: string[]
  projects: DiscoveredProject[]
}

function readEnvPath(name: string): string | null {
  const raw = process.env[name]
  if (!raw || !raw.trim()) return null
  return path.resolve(raw.trim())
}

function workspaceFromBoard(
  boardPath: string,
  source: AutoconfigSource
): AutoconfigWorkspace {
  const project = toDiscoveredProject(boardPath)
  return {
    source,
    singleProject: true,
    masters: [project.projectPath],
    projects: [project],
  }
}

function workspaceFromMaster(
  masterPath: string,
  source: AutoconfigSource
): AutoconfigWorkspace | null {
  let projects: DiscoveredProject[]
  try {
    projects = discoverTaskmarkProjects(masterPath)
  } catch {
    return null
  }
  if (projects.length === 0) return null
  return {
    source,
    singleProject: projects.length === 1,
    masters: [path.resolve(masterPath)],
    projects,
  }
}

/**
 * Candidate directories for cwd-based binding.
 * Prefers TASKMARK_CWD, then npm's INIT_CWD (where the user invoked npm), then process.cwd().
 */
export function cwdCandidates(): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of [
    process.env.TASKMARK_CWD,
    process.env.INIT_CWD,
    process.cwd(),
  ]) {
    if (!raw || !raw.trim()) continue
    const resolved = path.resolve(raw.trim())
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
 * Multi-git: product repo beside `<parentBasename>-taskmark` (or unique sibling).
 */
export function resolveSiblingDedicatedBoard(fromDir: string): string | null {
  const resolved = path.resolve(fromDir)
  const parent = path.dirname(resolved)
  const parentName = path.basename(parent)
  const preferred = path.join(parent, `${parentName}-taskmark`)
  const preferredBoard = resolveBoardAtPath(preferred)
  if (preferredBoard) return preferredBoard

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(parent, { withFileTypes: true })
  } catch {
    return null
  }

  const boards: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.endsWith("-taskmark")) continue
    const board = resolveBoardAtPath(path.join(parent, entry.name))
    if (board) boards.push(board)
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

/**
 * Resolve a zero-config workspace without cookies.
 *
 * Precedence: TASKMARK_BOARD → TASKMARK_MASTER → cwd layouts → sibling *-taskmark.
 * Returns null when nothing valid is found (caller should use cookie setup),
 * or when workspace mode asked for the multi-project picker instead of a bind.
 */
export function resolveAutoconfigWorkspace(): AutoconfigWorkspace | null {
  if (isWorkspaceMode()) return null

  const boardEnv = readEnvPath("TASKMARK_BOARD")
  if (boardEnv) {
    const board = resolveBoardAtPath(boardEnv)
    if (board) return workspaceFromBoard(board, "env_board")
    console.warn(
      `[taskmark] TASKMARK_BOARD is set but is not a valid board path: ${boardEnv}`
    )
  }

  const masterEnv = readEnvPath("TASKMARK_MASTER")
  if (masterEnv) {
    const fromMaster = workspaceFromMaster(masterEnv, "env_master")
    if (fromMaster) return fromMaster
    console.warn(
      `[taskmark] TASKMARK_MASTER is set but no Taskmark boards were found: ${masterEnv}`
    )
  }

  for (const candidate of cwdCandidates()) {
    const board = resolveBoardAtPath(candidate)
    if (board) return workspaceFromBoard(board, "cwd")
  }

  for (const candidate of cwdCandidates()) {
    const sibling = resolveSiblingDedicatedBoard(candidate)
    if (sibling) return workspaceFromBoard(sibling, "sibling")
  }

  return null
}
