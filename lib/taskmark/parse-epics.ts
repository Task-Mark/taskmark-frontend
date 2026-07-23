import fs from "node:fs"
import path from "node:path"

import type { DiscoveredProject } from "@/lib/taskmark/types"
import type {
  EpicParseError,
  EpicSummary,
  ProjectEpicList,
} from "@/lib/taskmark/epic-types"
import {
  asNumberOrNull,
  asString,
  asStringArray,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import { readTimingFields } from "@/lib/taskmark/timing"
import { sortEpicsGeneralFirst } from "@/lib/taskmark/general-epic"

function listEpicMarkdownFiles(boardPath: string): string[] {
  const epicsDir = path.join(boardPath, "epics")
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(epicsDir, { withFileTypes: true })
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith(".")) continue
    const epicFile = path.join(epicsDir, entry.name, "epic.md")
    if (fs.existsSync(epicFile)) {
      files.push(epicFile)
    }
  }
  return files.sort()
}

function parseEpicFile(
  filePath: string,
  project: DiscoveredProject
): { epic?: EpicSummary; error?: EpicParseError } {
  let raw: string
  try {
    raw = fs.readFileSync(filePath, "utf8")
  } catch (err) {
    return {
      error: {
        filePath,
        projectId: project.id,
        projectName: project.name,
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
        message: "Frontmatter requires id and title",
      },
    }
  }

  return {
    epic: {
      id,
      title,
      status: asString(frontmatter.status, "unknown"),
      priority: asString(frontmatter.priority, "medium"),
      size: asString(frontmatter.size, "—"),
      points: asNumberOrNull(frontmatter.points),
      ...readTimingFields(frontmatter),
      tags: asStringArray(frontmatter.tags),
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

/** Parse all epics under a project's board root (nested taskmark/ or flat *-taskmark). */
export function parseEpicsForProject(
  project: DiscoveredProject
): ProjectEpicList {
  const files = listEpicMarkdownFiles(project.boardPath)
  const epics: EpicSummary[] = []
  const errors: EpicParseError[] = []

  for (const filePath of files) {
    const result = parseEpicFile(filePath, project)
    if (result.epic) epics.push(result.epic)
    if (result.error) errors.push(result.error)
  }

  epics.sort((a, b) => a.id.localeCompare(b.id))
  const ordered = sortEpicsGeneralFirst(epics)

  return { project, epics: ordered, errors }
}

/** Parse epics for every discovered project under the master folder. */
export function parseEpicsForProjects(
  projects: DiscoveredProject[]
): ProjectEpicList[] {
  return projects.map(parseEpicsForProject)
}
