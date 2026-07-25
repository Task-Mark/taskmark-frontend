import fs from "node:fs"
import path from "node:path"

import {
  asString,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import type { WorkItemRef } from "@/lib/taskmark/detail-types"
import type { DiscoveredProject } from "@/lib/taskmark/types"

export type ResolvedWorkItem = WorkItemRef & {
  boardPath: string
  projectId: string
}

function readIdTitleType(
  filePath: string
): { id: string; title: string; type: string } | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8")
    const fm = extractFrontmatter(raw)
    if (!fm) return null
    const id = asString(fm.id)
    const title = asString(fm.title)
    if (!id) return null
    return { id, title, type: asString(fm.type).toLowerCase() }
  } catch {
    return null
  }
}

function toRef(
  meta: { id: string; title: string; type: string },
  filePath: string
): WorkItemRef | null {
  if (meta.type === "epic" || meta.id.startsWith("E-")) {
    return {
      kind: "epic",
      id: meta.id,
      title: meta.title || meta.id,
      filePath,
    }
  }
  if (meta.type === "story" || meta.id.startsWith("S-")) {
    return {
      kind: "story",
      id: meta.id,
      title: meta.title || meta.id,
      filePath,
    }
  }
  if (
    meta.type === "task" ||
    meta.type === "bug" ||
    meta.id.startsWith("T-") ||
    meta.id.startsWith("B-")
  ) {
    const itemType =
      meta.type === "bug" || meta.id.startsWith("B-") ? "bug" : "task"
    return {
      kind: "item",
      id: meta.id,
      title: meta.title || meta.id,
      filePath,
      itemType,
    }
  }
  return null
}

/** Find a work item markdown file by id under one board root. */
export function findWorkItemOnBoard(
  boardPath: string,
  itemId: string
): WorkItemRef | null {
  const id = itemId.trim()
  if (!id) return null

  const epicsDir = path.join(boardPath, "epics")
  let epicEntries: fs.Dirent[]
  try {
    epicEntries = fs.readdirSync(epicsDir, { withFileTypes: true })
  } catch {
    return null
  }

  for (const epicEntry of epicEntries) {
    if (!epicEntry.isDirectory() || epicEntry.name.startsWith(".")) continue
    const epicDir = path.join(epicsDir, epicEntry.name)

    const epicFile = path.join(epicDir, "epic.md")
    if (fs.existsSync(epicFile)) {
      const meta = readIdTitleType(epicFile)
      if (meta?.id === id) return toRef(meta, epicFile)
    }

    const epicItemsDir = path.join(epicDir, "items")
    try {
      for (const name of fs.readdirSync(epicItemsDir)) {
        if (!name.endsWith(".md") || name.startsWith(".")) continue
        const filePath = path.join(epicItemsDir, name)
        const meta = readIdTitleType(filePath)
        if (meta?.id === id) return toRef(meta, filePath)
      }
    } catch {
      /* no epic-direct items */
    }

    const storiesDir = path.join(epicDir, "stories")
    let storyEntries: fs.Dirent[]
    try {
      storyEntries = fs.readdirSync(storiesDir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const storyEntry of storyEntries) {
      if (!storyEntry.isDirectory() || storyEntry.name.startsWith(".")) continue
      const storyDir = path.join(storiesDir, storyEntry.name)
      const storyFile = path.join(storyDir, "story.md")
      if (fs.existsSync(storyFile)) {
        const meta = readIdTitleType(storyFile)
        if (meta?.id === id) return toRef(meta, storyFile)
      }

      const storyItemsDir = path.join(storyDir, "items")
      try {
        for (const name of fs.readdirSync(storyItemsDir)) {
          if (!name.endsWith(".md") || name.startsWith(".")) continue
          const filePath = path.join(storyItemsDir, name)
          const meta = readIdTitleType(filePath)
          if (meta?.id === id) return toRef(meta, filePath)
        }
      } catch {
        /* no story items */
      }
    }
  }

  return null
}

/** Search configured projects for a work item id (first match wins). */
export function findWorkItemInProjects(
  projects: DiscoveredProject[],
  itemId: string
): ResolvedWorkItem | null {
  for (const project of projects) {
    const ref = findWorkItemOnBoard(project.boardPath, itemId)
    if (ref) {
      return {
        ...ref,
        boardPath: project.boardPath,
        projectId: project.id,
      }
    }
  }
  return null
}
