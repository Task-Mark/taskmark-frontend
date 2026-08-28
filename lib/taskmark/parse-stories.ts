import fs from "node:fs"
import path from "node:path"

import type { DiscoveredProject } from "@/lib/taskmark/types"
import type {
  EpicStoryList,
  StoryParseError,
  StorySummary,
} from "@/lib/taskmark/story-types"
import {
  asString,
  asStringArray,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import { asContributorList } from "@/lib/taskmark/identity"
import { deriveParentRollup } from "@/lib/taskmark/derive-parents"
import type { BoardIndex } from "@/lib/taskmark/board-index"

type EpicFolder = {
  dirName: string
  epicFile: string
  id: string
  title: string
}

function readEpicFolderMeta(
  epicDir: string,
  dirName: string
): EpicFolder | null {
  const epicFile = path.join(epicDir, "epic.md")
  if (!fs.existsSync(epicFile)) return null

  let raw: string
  try {
    raw = fs.readFileSync(epicFile, "utf8")
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

  return { dirName, epicFile, id, title }
}

/** Resolve the epic folder directory for a given epic id under a board. */
export function findEpicFolder(
  boardPath: string,
  epicId: string
): EpicFolder | null {
  const epicsDir = path.join(boardPath, "epics")
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(epicsDir, { withFileTypes: true })
  } catch {
    return null
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    const meta = readEpicFolderMeta(path.join(epicsDir, entry.name), entry.name)
    if (meta?.id === epicId) return meta
  }
  return null
}

function listStoryMarkdownFiles(epicDir: string): string[] {
  const storiesDir = path.join(epicDir, "stories")
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(storiesDir, { withFileTypes: true })
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    const storyFile = path.join(storiesDir, entry.name, "story.md")
    if (fs.existsSync(storyFile)) {
      files.push(storyFile)
    }
  }
  return files.sort()
}

function parseStoryFile(
  filePath: string,
  project: DiscoveredProject,
  epicId: string,
  index?: BoardIndex
): { story?: StorySummary; error?: StoryParseError } {
  let raw: string
  try {
    raw = fs.readFileSync(filePath, "utf8")
  } catch (err) {
    return {
      error: {
        filePath,
        projectId: project.id,
        projectName: project.name,
        epicId,
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
        epicId,
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
        epicId,
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
        epicId,
        message: "Frontmatter requires id and title",
      },
    }
  }

  const derived = deriveParentRollup(project.boardPath, id, "story", index)

  return {
    story: {
      id,
      title,
      status: derived.status,
      priority: asString(frontmatter.priority, "medium"),
      size: derived.size,
      points: derived.points,
      estimateMinutes: derived.estimateMinutes,
      actualMinutes: derived.actualMinutes,
      actualMs: derived.actualMs,
      tags: asStringArray(frontmatter.tags),
      reporters: asContributorList(frontmatter.reporters),
      resolvers: derived.resolvers,
      created: asString(frontmatter.created),
      completedAt: derived.completedAt,
      parent: asString(frontmatter.parent),
      epic: asString(frontmatter.epic, epicId),
      workItemCount: derived.leafCount,
      doneWorkItemCount: derived.doneLeafCount,
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
 * Parse all stories under a selected epic for a project's board root.
 * Returns an empty story list (with no errors) when the epic folder is missing.
 */
export function parseStoriesForEpic(
  project: DiscoveredProject,
  epicId: string,
  index?: BoardIndex
): EpicStoryList {
  const folder = findEpicFolder(project.boardPath, epicId)
  if (!folder) {
    return {
      project,
      epicId,
      epicTitle: null,
      stories: [],
      errors: [
        {
          filePath: path.join(project.boardPath, "epics"),
          projectId: project.id,
          projectName: project.name,
          epicId,
          message: `Epic ${epicId} not found under this board`,
        },
      ],
    }
  }

  const epicDir = path.join(project.boardPath, "epics", folder.dirName)
  const files = listStoryMarkdownFiles(epicDir)
  const stories: StorySummary[] = []
  const errors: StoryParseError[] = []

  for (const filePath of files) {
    const result = parseStoryFile(filePath, project, epicId, index)
    if (result.story) stories.push(result.story)
    if (result.error) errors.push(result.error)
  }

  stories.sort((a, b) => a.id.localeCompare(b.id))

  return {
    project,
    epicId,
    epicTitle: folder.title || null,
    stories,
    errors,
  }
}
