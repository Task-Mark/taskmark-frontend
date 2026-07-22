"use server"

import fs from "node:fs"
import path from "node:path"

import { getMasterFoldersCookie } from "@/lib/taskmark/cookies"
import { parseWorkItemDetailFromRaw } from "@/lib/taskmark/parse-detail"
import type { WorkItemDetailResult } from "@/lib/taskmark/detail-types"
import { loadConfiguredWorkspace } from "@/lib/taskmark/workspace"

function isPathInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child)
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}

/**
 * Load and parse a full work item detail from an absolute markdown path.
 * Path must resolve under a configured project's boardPath.
 */
export async function loadWorkItemDetail(
  filePath: string,
  hint?: "epic" | "story" | "item"
): Promise<WorkItemDetailResult> {
  if (!filePath || typeof filePath !== "string") {
    return { ok: false, filePath: filePath ?? "", message: "Missing file path" }
  }

  const resolved = path.resolve(filePath)
  if (!resolved.endsWith(".md")) {
    return { ok: false, filePath: resolved, message: "Not a markdown file" }
  }

  const masters = await getMasterFoldersCookie()
  if (masters.length === 0) {
    return { ok: false, filePath: resolved, message: "No workspace configured" }
  }

  const workspace = loadConfiguredWorkspace(masters)
  const allowed = workspace.projects.some((p) =>
    isPathInside(path.resolve(p.boardPath), resolved)
  )
  if (!allowed) {
    return {
      ok: false,
      filePath: resolved,
      message: "File is outside configured Taskmark boards",
    }
  }

  let raw: string
  try {
    raw = fs.readFileSync(resolved, "utf8")
  } catch (err) {
    return {
      ok: false,
      filePath: resolved,
      message: err instanceof Error ? err.message : "Failed to read file",
    }
  }

  return parseWorkItemDetailFromRaw(raw, resolved, hint)
}
