"use server"

import { getActiveProjectCookie, getMasterFoldersCookie } from "@/lib/taskmark/cookies"
import { resolveActiveProject } from "@/lib/taskmark/active-project"
import type { WorkItemDetailResult } from "@/lib/taskmark/detail-types"
import {
  loadWorkItemDetailSync,
  resolveWorkItemByIdSync,
} from "@/lib/taskmark/detail-load"
import { loadConfiguredWorkspace, loadWorkspace } from "@/lib/taskmark/workspace"

export type ResolveWorkItemResult =
  | { ok: true; ref: import("@/lib/taskmark/detail-types").WorkItemRef }
  | { ok: false; itemId: string; message: string }

/**
 * Resolve a shareable work item id (E-/S-/T-/B-) to a WorkItemRef.
 */
export async function resolveWorkItemById(
  itemId: string,
  options?: { withinFilePath?: string | null }
): Promise<ResolveWorkItemResult> {
  const masters = await getMasterFoldersCookie()
  const workspace = loadWorkspace(masters)
  if (workspace.projects.length === 0) {
    return {
      ok: false,
      itemId: typeof itemId === "string" ? itemId.trim() : "",
      message: "No workspace configured",
    }
  }

  const savedActiveId = await getActiveProjectCookie()
  const active = resolveActiveProject(
    workspace.projects,
    workspace.autoconfig ? null : savedActiveId
  )

  return resolveWorkItemByIdSync(workspace.projects, itemId, {
    withinFilePath: options?.withinFilePath,
    activeBoardPath: active?.boardPath ?? null,
  })
}

/**
 * Load and parse a full work item detail from an absolute markdown path.
 */
export async function loadWorkItemDetail(
  filePath: string,
  hint?: "epic" | "story" | "item"
): Promise<WorkItemDetailResult> {
  const masters = await getMasterFoldersCookie()
  const workspace = loadWorkspace(masters)
  if (workspace.projects.length === 0) {
    return {
      ok: false,
      filePath: filePath ?? "",
      message: "No workspace configured",
    }
  }
  return loadWorkItemDetailSync(workspace.projects, filePath, hint)
}
