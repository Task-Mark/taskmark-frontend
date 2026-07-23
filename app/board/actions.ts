"use server"

import fs from "node:fs"
import path from "node:path"

import { getMasterFoldersCookie } from "@/lib/taskmark/cookies"
import { parseWorkItemDetailFromRaw } from "@/lib/taskmark/parse-detail"
import type {
  DetailChildItem,
  WorkItemDetail,
  WorkItemDetailResult,
} from "@/lib/taskmark/detail-types"
import { parseItemsForEpic, parseItemsForStory } from "@/lib/taskmark/parse-items"
import { parseStoriesForEpic } from "@/lib/taskmark/parse-stories"
import type { DiscoveredProject } from "@/lib/taskmark/types"
import { loadConfiguredWorkspace } from "@/lib/taskmark/workspace"

function isPathInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child)
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}

function findProjectForFile(
  projects: DiscoveredProject[],
  filePath: string
): DiscoveredProject | null {
  const resolved = path.resolve(filePath)
  return (
    projects.find((p) => isPathInside(path.resolve(p.boardPath), resolved)) ??
    null
  )
}

function attachChildren(
  detail: WorkItemDetail,
  project: DiscoveredProject
): WorkItemDetail {
  if (detail.type === "epic") {
    const children: DetailChildItem[] = []
    const stories = parseStoriesForEpic(project, detail.id)
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
    const epicItems = parseItemsForEpic(project, detail.id)
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
    const items = parseItemsForStory(project, epicId, detail.id)
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
  const project = findProjectForFile(workspace.projects, resolved)
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

  return { ok: true, detail: attachChildren(result.detail, project) }
}
