import fs from "node:fs"
import path from "node:path"

import type { DiscoveredProject } from "@/lib/taskmark/types"
import type {
  ItemParseError,
  ItemSummary,
  ItemType,
  StoryItemList,
} from "@/lib/taskmark/item-types"
import {
  asNumberOrNull,
  asString,
  asStringArray,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import { asContributorList } from "@/lib/taskmark/identity"
import { findEpicFolder } from "@/lib/taskmark/parse-stories"
import { readTimingFields } from "@/lib/taskmark/timing"

type StoryFolder = {
  dirName: string
  storyFile: string
  id: string
  title: string
  epicDirName: string
}

function readStoryFolderMeta(
  storyDir: string,
  dirName: string,
  epicDirName: string
): StoryFolder | null {
  const storyFile = path.join(storyDir, "story.md")
  if (!fs.existsSync(storyFile)) return null

  let raw: string
  try {
    raw = fs.readFileSync(storyFile, "utf8")
  } catch {
    return null
  }

  let frontmatter: Record<string, unknown> | null
  try {
    frontmatter = extractFrontmatter(raw)
  } catch {
    return null
  }
  if (!frontmatter) return null

  const id = asString(frontmatter.id)
  const title = asString(frontmatter.title)
  if (!id) return null

  return { dirName, storyFile, id, title, epicDirName }
}

/** Resolve the story folder under an epic for a given story id. */
export function findStoryFolder(
  boardPath: string,
  epicId: string,
  storyId: string
): StoryFolder | null {
  const epic = findEpicFolder(boardPath, epicId)
  if (!epic) return null

  const storiesDir = path.join(boardPath, "epics", epic.dirName, "stories")
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(storiesDir, { withFileTypes: true })
  } catch {
    return null
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    const meta = readStoryFolderMeta(
      path.join(storiesDir, entry.name),
      entry.name,
      epic.dirName
    )
    if (meta?.id === storyId) return meta
  }
  return null
}

function listItemMarkdownFiles(itemsParentDir: string): string[] {
  const itemsDir = path.join(itemsParentDir, "items")
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(itemsDir, { withFileTypes: true })
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue
    if (!entry.name.endsWith(".md")) continue
    files.push(path.join(itemsDir, entry.name))
  }
  return files.sort()
}

function resolveItemType(
  frontmatter: Record<string, unknown>,
  id: string
): ItemType {
  const raw = asString(frontmatter.type).toLowerCase()
  if (raw === "bug") return "bug"
  if (raw === "task") return "task"
  if (id.startsWith("B-")) return "bug"
  return "task"
}

function parseItemFile(
  filePath: string,
  project: DiscoveredProject,
  parentId: string,
  epicId: string
): { item?: ItemSummary; error?: ItemParseError } {
  let raw: string
  try {
    raw = fs.readFileSync(filePath, "utf8")
  } catch (err) {
    return {
      error: {
        filePath,
        projectId: project.id,
        projectName: project.name,
        storyId: parentId,
        message: err instanceof Error ? err.message : "Failed to read file",
      },
    }
  }

  let frontmatter: Record<string, unknown> | null
  try {
    frontmatter = extractFrontmatter(raw)
  } catch (err) {
    return {
      error: {
        filePath,
        projectId: project.id,
        projectName: project.name,
        storyId: parentId,
        message:
          err instanceof Error ? err.message : "Invalid YAML frontmatter",
      },
    }
  }

  if (!frontmatter) {
    return {
      error: {
        filePath,
        projectId: project.id,
        projectName: project.name,
        storyId: parentId,
        message: "Missing or invalid YAML frontmatter",
      },
    }
  }

  const id = asString(frontmatter.id)
  const title = asString(frontmatter.title)
  if (!id || !title) {
    return {
      error: {
        filePath,
        projectId: project.id,
        projectName: project.name,
        storyId: parentId,
        message: "Frontmatter requires id and title",
      },
    }
  }

  return {
    item: {
      id,
      type: resolveItemType(frontmatter, id),
      title,
      status: asString(frontmatter.status, "unknown"),
      priority: asString(frontmatter.priority, "medium"),
      size: asString(frontmatter.size, "—"),
      points: asNumberOrNull(frontmatter.points),
      ...readTimingFields(frontmatter),
      tags: asStringArray(frontmatter.tags),
      reporters: asContributorList(frontmatter.reporters),
      resolvers: asContributorList(frontmatter.resolvers),
      created: asString(frontmatter.created),
      completedAt: asString(frontmatter.completed_at),
      parent: asString(frontmatter.parent, parentId),
      epic: asString(frontmatter.epic, epicId),
      filePath,
      project: {
        id: project.id,
        name: project.name,
        projectPath: project.projectPath,
        boardPath: project.boardPath,
      },
    },
  }
}

/**
 * Parse all tasks/bugs under a selected story for a project's board root.
 */
export function parseItemsForStory(
  project: DiscoveredProject,
  epicId: string,
  storyId: string
): StoryItemList {
  const folder = findStoryFolder(project.boardPath, epicId, storyId)
  if (!folder) {
    const epic = findEpicFolder(project.boardPath, epicId)
    return {
      project,
      epicId,
      storyId,
      storyTitle: null,
      items: [],
      errors: [
        {
          filePath: epic
            ? path.join(project.boardPath, "epics", epic.dirName, "stories")
            : path.join(project.boardPath, "epics"),
          projectId: project.id,
          projectName: project.name,
          storyId,
          message: epic
            ? `Story ${storyId} not found under epic ${epicId}`
            : `Epic ${epicId} not found under this board`,
        },
      ],
    }
  }

  const storyDir = path.join(
    project.boardPath,
    "epics",
    folder.epicDirName,
    "stories",
    folder.dirName
  )
  const files = listItemMarkdownFiles(storyDir)
  const items: ItemSummary[] = []
  const errors: ItemParseError[] = []

  for (const filePath of files) {
    const result = parseItemFile(filePath, project, storyId, epicId)
    if (result.item) items.push(result.item)
    if (result.error) errors.push(result.error)
  }

  items.sort((a, b) => a.id.localeCompare(b.id))

  return {
    project,
    epicId,
    storyId,
    storyTitle: folder.title || null,
    items,
    errors,
  }
}

/**
 * Parse tasks/bugs living directly under an epic (epics/{E}/items/), no story.
 */
export function parseItemsForEpic(
  project: DiscoveredProject,
  epicId: string
): StoryItemList {
  const epic = findEpicFolder(project.boardPath, epicId)
  if (!epic) {
    return {
      project,
      epicId,
      storyId: epicId,
      storyTitle: null,
      items: [],
      errors: [
        {
          filePath: path.join(project.boardPath, "epics"),
          projectId: project.id,
          projectName: project.name,
          storyId: epicId,
          message: `Epic ${epicId} not found under this board`,
        },
      ],
    }
  }

  const epicDir = path.join(project.boardPath, "epics", epic.dirName)
  const files = listItemMarkdownFiles(epicDir)
  const items: ItemSummary[] = []
  const errors: ItemParseError[] = []

  for (const filePath of files) {
    const result = parseItemFile(filePath, project, epicId, epicId)
    if (result.item) items.push(result.item)
    if (result.error) errors.push(result.error)
  }

  items.sort((a, b) => a.id.localeCompare(b.id))

  return {
    project,
    epicId,
    storyId: epicId,
    storyTitle: "Epic-direct",
    items,
    errors,
  }
}
