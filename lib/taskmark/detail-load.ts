/**
 * Shared board detail loading (used by server actions and static snapshot).
 */
import fs from "node:fs"
import path from "node:path"

import { parseWorkItemDetailFromRaw } from "@/lib/taskmark/parse-detail"
import type {
  DetailChildItem,
  WorkItemDetail,
  WorkItemDetailResult,
} from "@/lib/taskmark/detail-types"
import { parseItemsForEpic, parseItemsForStory } from "@/lib/taskmark/parse-items"
import { parseStoriesForEpic } from "@/lib/taskmark/parse-stories"
import type { DiscoveredProject } from "@/lib/taskmark/types"
import {
  findWorkItemInProjects,
  findWorkItemOnBoard,
} from "@/lib/taskmark/resolve-work-item"
import type { WorkItemRef } from "@/lib/taskmark/detail-types"
import { deriveParentRollup } from "@/lib/taskmark/derive-parents"
import {
  buildBoardIndex,
  type BoardIndex,
} from "@/lib/taskmark/board-index"

function isPathInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child)
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}

export function findProjectForFile(
  projects: DiscoveredProject[],
  filePath: string
): DiscoveredProject | null {
  const resolved = path.resolve(filePath)
  return (
    projects.find((p) => isPathInside(path.resolve(p.boardPath), resolved)) ??
    null
  )
}

export function attachChildren(
  detail: WorkItemDetail,
  project: DiscoveredProject,
  index?: BoardIndex
): WorkItemDetail {
  if (detail.type === "epic") {
    const children: DetailChildItem[] = []
    const stories = parseStoriesForEpic(project, detail.id, index)
    for (const story of stories.stories) {
      children.push({
        id: story.id,
        title: story.title,
        type: "story",
        status: story.status,
        priority: story.priority,
        filePath: story.filePath,
      })
    }
    const epicItems = parseItemsForEpic(project, detail.id, index)
    for (const item of epicItems.items) {
      children.push({
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        priority: item.priority,
        filePath: item.filePath,
      })
    }
    return { ...detail, children }
  }

  if (detail.type === "story") {
    const epicId = detail.epic || detail.parent
    if (!epicId) return detail
    const children: DetailChildItem[] = []
    const items = parseItemsForStory(project, epicId, detail.id, index)
    for (const item of items.items) {
      children.push({
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        priority: item.priority,
        filePath: item.filePath,
      })
    }
    return { ...detail, children }
  }

  return detail
}

function attachDerivedParentFields(
  detail: WorkItemDetail,
  project: DiscoveredProject,
  index?: BoardIndex
): WorkItemDetail {
  if (detail.type !== "epic" && detail.type !== "story") return detail
  const derived = deriveParentRollup(
    project.boardPath,
    detail.id,
    detail.type,
    index,
    true
  )
  return {
    ...detail,
    status: derived.status,
    size: derived.size,
    points: derived.points,
    actualMinutes: derived.actualMinutes,
    actualMs: derived.actualMs,
    resolvers: derived.resolvers,
    updated: derived.updated,
    startedAt: derived.startedAt,
    completedAt: derived.completedAt,
    promptFeedback: derived.promptFeedback,
    commits: derived.commits,
    workLog: derived.workLog,
  }
}

export function loadWorkItemDetailSync(
  projects: DiscoveredProject[],
  filePath: string,
  hint?: "epic" | "story" | "item",
  index?: BoardIndex
): WorkItemDetailResult {
  if (!filePath || typeof filePath !== "string") {
    return { ok: false, filePath: filePath ?? "", message: "Missing file path" }
  }

  const resolved = path.resolve(filePath)
  if (!resolved.endsWith(".md")) {
    return { ok: false, filePath: resolved, message: "Not a markdown file" }
  }

  const project = findProjectForFile(projects, resolved)
  if (!project) {
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

  const result = parseWorkItemDetailFromRaw(raw, resolved, hint)
  if (!result.ok) return result
  if (result.detail.type !== "epic" && result.detail.type !== "story") {
    return result
  }

  const boardIndex = index ?? buildBoardIndex(project.boardPath)
  const derived = attachDerivedParentFields(result.detail, project, boardIndex)
  return { ok: true, detail: attachChildren(derived, project, boardIndex) }
}

export function resolveWorkItemByIdSync(
  projects: DiscoveredProject[],
  itemId: string,
  options?: {
    withinFilePath?: string | null
    activeBoardPath?: string | null
  }
):
  | { ok: true; ref: WorkItemRef }
  | { ok: false; itemId: string; message: string } {
  const id = typeof itemId === "string" ? itemId.trim() : ""
  if (!id) {
    return { ok: false, itemId: "", message: "Missing work item id" }
  }

  const within = options?.withinFilePath?.trim() || null
  if (within) {
    const project = findProjectForFile(projects, within)
    if (!project) {
      return {
        ok: false,
        itemId: id,
        message: "File is outside configured Taskmark boards",
      }
    }
    const ref = findWorkItemOnBoard(project.boardPath, id)
    if (!ref) {
      return {
        ok: false,
        itemId: id,
        message: `Work item ${id} was not found on this project board`,
      }
    }
    return { ok: true, ref }
  }

  const boardPath = options?.activeBoardPath?.trim() || null
  const resolved = findWorkItemInProjects(projects, id, {
    boardPath: boardPath ?? undefined,
  })
  if (!resolved) {
    return {
      ok: false,
      itemId: id,
      message: `Work item ${id} was not found on the active board`,
    }
  }

  const ref: WorkItemRef = {
    kind: resolved.kind,
    id: resolved.id,
    title: resolved.title,
    filePath: resolved.filePath,
    ...(resolved.itemType ? { itemType: resolved.itemType } : {}),
  }
  return { ok: true, ref }
}
