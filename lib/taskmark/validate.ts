import fs from "node:fs"
import path from "node:path"

import { discoverTaskmarkProjects } from "@/lib/taskmark/discover"
import type { ValidateMasterFolderResult } from "@/lib/taskmark/types"

export function validateMasterFolder(
  rawPath: string
): ValidateMasterFolderResult {
  const trimmed = rawPath.trim()
  if (!trimmed) {
    return {
      ok: false,
      code: "empty",
      error: "Enter a master folder path.",
    }
  }

  const masterPath = path.resolve(trimmed)

  let stat: fs.Stats
  try {
    stat = fs.statSync(masterPath)
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : ""
    if (code === "ENOENT") {
      return {
        ok: false,
        code: "not_found",
        error: `Folder not found: ${masterPath}`,
      }
    }
    return {
      ok: false,
      code: "unreadable",
      error: `Cannot read folder: ${masterPath}`,
    }
  }

  if (!stat.isDirectory()) {
    return {
      ok: false,
      code: "not_directory",
      error: `Path is not a folder: ${masterPath}`,
    }
  }

  let projects
  try {
    projects = discoverTaskmarkProjects(masterPath)
  } catch {
    return {
      ok: false,
      code: "unreadable",
      error: `Cannot scan folder: ${masterPath}`,
    }
  }

  if (projects.length === 0) {
    return {
      ok: false,
      code: "no_projects",
      error:
        "No Taskmark projects found in subfolders. Look for a nested taskmark/ board (INDEX.md or epics/), or a dedicated *-taskmark folder with those files at its root.",
    }
  }

  return { ok: true, masterPath, projects }
}
