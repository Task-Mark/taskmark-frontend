import fs from "node:fs"
import path from "node:path"

import { parse as parseYaml } from "yaml"

import type { DiscoveredProject } from "@/lib/taskmark/types"
import type {
  EpicParseError,
  EpicSummary,
  ProjectEpicList,
} from "@/lib/taskmark/epic-types"

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

/**
 * Some board edits historically glued the closing fence onto the last
 * frontmatter line (`completed_at: …Z---`). Normalize before matching.
 */
function normalizeFrontmatterSource(raw: string): string {
  if (!raw.startsWith("---")) return raw
  return raw.replace(/^(---\r?\n[\s\S]*?\S)---(\r?\n)/, "$1\n---$2")
}

function extractFrontmatter(raw: string): Record<string, unknown> | null {
  const source = normalizeFrontmatterSource(raw)
  const match = FRONTMATTER_RE.exec(source)
  if (!match) return null
  const parsed = parseYaml(match[1])
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null
  }
  return parsed as Record<string, unknown>
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return fallback
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => asString(v)).filter(Boolean)
}

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
      estimateMinutes: asNumberOrNull(frontmatter.estimate_minutes),
      actualMinutes: asNumberOrNull(frontmatter.actual_minutes),
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

/** Parse all epics under a single project's taskmark/ board. */
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

  return { project, epics, errors }
}

/** Parse epics for every discovered project under the master folder. */
export function parseEpicsForProjects(
  projects: DiscoveredProject[]
): ProjectEpicList[] {
  return projects.map(parseEpicsForProject)
}
