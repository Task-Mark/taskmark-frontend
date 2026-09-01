import fs from "node:fs"
import path from "node:path"

import type { DiscoveredProject } from "@/lib/taskmark/types"
import type {
  EpicParseError,
  EpicSummary,
  ProjectEpicList,
} from "@/lib/taskmark/epic-types"
import {
  asString,
  asStringArray,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import { asContributorList } from "@/lib/taskmark/identity"
import { sortEpicsGeneralFirst } from "@/lib/taskmark/general-epic"
import { deriveParentRollup } from "@/lib/taskmark/derive-parents"
import type { BoardIndex } from "@/lib/taskmark/board-index"

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
  project: DiscoveredProject,
  index?: BoardIndex
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

  const derived = deriveParentRollup(
    project.boardPath,
    id,
    "epic",
    index,
    false,
    frontmatter
  )

  return {
    epic: {
      id,
      title,
      status: derived.status,
      priority: asString(frontmatter.priority, "medium"),
      size: derived.size,
      points: derived.points,
      actualMinutes: derived.actualMinutes,
      actualMs: derived.actualMs,
      tags: asStringArray(frontmatter.tags),
      reporters: asContributorList(frontmatter.reporters),
      resolvers: derived.resolvers,
      created: asString(frontmatter.created),
      updated: asString(frontmatter.updated),
      completedAt: derived.completedAt,
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

/** Parse all epics under a project's board root (nested taskmark/ or flat *-taskmark). */
export function parseEpicsForProject(
  project: DiscoveredProject,
  index?: BoardIndex
): ProjectEpicList {
  const files = listEpicMarkdownFiles(project.boardPath)
  const epics: EpicSummary[] = []
  const errors: EpicParseError[] = []

  for (const filePath of files) {
    const result = parseEpicFile(filePath, project, index)
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
  return projects.map((project) => parseEpicsForProject(project))
}
