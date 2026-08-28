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
        error: "Folder not found. Check the path and try again.",
      }
    }
    return {
      ok: false,
      code: "unreadable",
      error: "Cannot read that folder. Check permissions and try again.",
    }
  }

  if (!stat.isDirectory()) {
    return {
      ok: false,
      code: "not_directory",
      error: "That path is not a folder.",
    }
  }

  let projects
  try {
    projects = discoverTaskmarkProjects(masterPath)
  } catch {
    return {
      ok: false,
      code: "unreadable",
      error: "Cannot scan that folder. Check permissions and try again.",
    }
  }

  if (projects.length === 0) {
    return {
      ok: false,
      code: "no_projects",
      error:
        "No Taskmark projects found in subfolders. Look for a nested taskmark/epics/ board, or a dedicated *-taskmark folder with epics/ at its root.",
    }
  }

  return { ok: true, masterPath, projects }
}
