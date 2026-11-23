import fs from "node:fs"
import path from "node:path"

/**
 * Board folder layout.
 *
 * Legacy boards keep every epic under `epics/`. Request boards group epics
 * under the request they belong to: `requests/<slug>/epics/<epic>/`. Both can
 * live side by side while a board is being migrated, so every walker asks this
 * module for the folders that hold epics instead of joining `epics` itself.
 */

export const LEGACY_EPICS_DIR = "epics"
export const REQUESTS_DIR = "requests"
export const MEETINGS_DIR = "meetings"
export const REQUEST_BRIEF_FILE = "brief.md"
export const REQUEST_LOG_DIR = "log"

function listSubdirs(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort()
  } catch {
    return []
  }
}

/** Request slugs (folder names under `requests/`) that have a brief. */
export function listRequestSlugs(boardPath: string): string[] {
  const requestsDir = path.join(boardPath, REQUESTS_DIR)
  return listSubdirs(requestsDir).filter((slug) =>
    fs.existsSync(path.join(requestsDir, slug, REQUEST_BRIEF_FILE))
  )
}

/**
 * Board-relative folders that directly contain epic folders, legacy first.
 * Only folders that exist are returned.
 */
export function epicRootRelDirs(boardPath: string): string[] {
  const roots: string[] = []
  if (fs.existsSync(path.join(boardPath, LEGACY_EPICS_DIR))) {
    roots.push(LEGACY_EPICS_DIR)
  }
  for (const slug of listSubdirs(path.join(boardPath, REQUESTS_DIR))) {
    const rel = path.join(REQUESTS_DIR, slug, LEGACY_EPICS_DIR)
    if (fs.existsSync(path.join(boardPath, rel))) roots.push(rel)
  }
  return roots
}

export type EpicFolderLocation = {
  /** Board-relative folder of the epic, e.g. `requests/careers/epics/E-1-x`. */
  relDir: string
  /** Absolute folder of the epic. */
  absDir: string
  /** Request slug when the epic lives under `requests/`, else null. */
  requestSlug: string | null
}

/** Every epic folder on the board, legacy and request-scoped. */
export function listEpicFolderLocations(
  boardPath: string
): EpicFolderLocation[] {
  const out: EpicFolderLocation[] = []
  for (const root of epicRootRelDirs(boardPath)) {
    for (const name of listSubdirs(path.join(boardPath, root))) {
      const relDir = path.join(root, name)
      out.push({
        relDir,
        absDir: path.join(boardPath, relDir),
        requestSlug: requestSlugForRelPath(relDir),
      })
    }
  }
  return out
}

/** `requests/<slug>/...` → `<slug>`; anything else → null. */
export function requestSlugForRelPath(relPath: string): string | null {
  const parts = relPath.split(/[\\/]+/).filter(Boolean)
  if (parts[0] !== REQUESTS_DIR || parts.length < 2) return null
  return parts[1] ?? null
}

/** A folder is a board when it has legacy `epics/` or a `requests/` tree. */
export function hasBoardLayout(boardPath: string): boolean {
  return (
    fs.existsSync(path.join(boardPath, LEGACY_EPICS_DIR)) ||
    fs.existsSync(path.join(boardPath, REQUESTS_DIR))
  )
}

/** Folders whose markdown belongs to the board (for asset scans and sync). */
export function boardContentRelDirs(boardPath: string): string[] {
  return [LEGACY_EPICS_DIR, REQUESTS_DIR, MEETINGS_DIR].filter((dir) =>
    fs.existsSync(path.join(boardPath, dir))
  )
}
