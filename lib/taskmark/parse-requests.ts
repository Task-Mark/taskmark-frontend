import fs from "node:fs"
import path from "node:path"

import {
  REQUEST_BRIEF_FILE,
  REQUEST_LOG_DIR,
  REQUESTS_DIR,
  listEpicFolderLocations,
  listRequestSlugs,
} from "@/lib/taskmark/board-layout"
import { buildBoardIndex, type BoardIndex } from "@/lib/taskmark/board-index"
import { leafPoints } from "@/lib/taskmark/derive-parents"
import {
  asString,
  asStringArray,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import { asContributorList } from "@/lib/taskmark/identity"
import {
  extractMarkdownBody,
  extractSections,
  getSection,
  parseChecklist,
  type ChecklistItem,
} from "@/lib/taskmark/parse-sections"
import {
  REQUEST_LOG_KINDS,
  REQUEST_STATUSES,
  type ProjectRequestList,
  type RequestLink,
  type RequestLogEntry,
  type RequestLogKind,
  type RequestParseError,
  type RequestStatus,
  type RequestSummary,
} from "@/lib/taskmark/request-types"
import {
  emptyStageCounts,
  parseStage,
  rollupStage,
  type Stage,
} from "@/lib/taskmark/stage"
import type { DiscoveredProject } from "@/lib/taskmark/types"

/** Plain `- item` lines (checkboxes excluded) as text. */
export function bulletLines(markdown: string): string[] {
  const out: string[] = []
  for (const line of markdown.split(/\r?\n/)) {
    const m = /^\s*[-*]\s+(?!\[[ xX]\])(.*\S)\s*$/.exec(line)
    if (m) out.push(m[1].trim())
  }
  return out
}

/** Checklist items, or plain bullets as unchecked items when there are none. */
export function checklistOrBullets(markdown: string): ChecklistItem[] {
  const checklist = parseChecklist(markdown)
  if (checklist.length > 0) return checklist
  return bulletLines(markdown).map((text) => ({ text, checked: false }))
}

function asRequestStatus(value: unknown): RequestStatus | null {
  const v = asString(value).trim().toLowerCase().replace(/\s+/g, "_")
  return (REQUEST_STATUSES as readonly string[]).includes(v)
    ? (v as RequestStatus)
    : null
}

function asLinks(value: unknown): RequestLink[] {
  if (!Array.isArray(value)) return []
  const out: RequestLink[] = []
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim()) {
      out.push({ request: entry.trim(), relation: "relates-to" })
    } else if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>
      const request = asString(record.request ?? record.id).trim()
      if (request) {
        out.push({
          request,
          relation: asString(record.relation, "relates-to").trim() || "relates-to",
        })
      }
    }
  }
  return out
}

function asLogKind(value: unknown): RequestLogKind {
  const v = asString(value).trim().toLowerCase()
  return (REQUEST_LOG_KINDS as readonly string[]).includes(v)
    ? (v as RequestLogKind)
    : "note"
}

function asPerson(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return asContributorList([value])[0] ?? null
  }
  if (typeof value === "string" && value.trim()) {
    return asContributorList([{ name: value.trim() }])[0] ?? null
  }
  return asContributorList(value)[0] ?? null
}

function isLeafDone(frontmatter: Record<string, unknown>): boolean {
  return asString(frontmatter.status).trim().toLowerCase() === "done"
}

function isLeafStarted(frontmatter: Record<string, unknown>): boolean {
  const status = asString(frontmatter.status).trim().toLowerCase()
  return status === "in_progress" || status === "blocked" || status === "done"
}

/** Read the log entries of one request, newest first. */
export function parseRequestLog(
  requestDir: string,
  requestId: string
): RequestLogEntry[] {
  const logDir = path.join(requestDir, REQUEST_LOG_DIR)
  let names: string[]
  try {
    names = fs.readdirSync(logDir).filter((n) => n.endsWith(".md") && !n.startsWith("."))
  } catch {
    return []
  }

  const entries: RequestLogEntry[] = []
  for (const name of names) {
    const filePath = path.join(logDir, name)
    try {
      const raw = fs.readFileSync(filePath, "utf8")
      const fm = extractFrontmatter(raw) ?? {}
      entries.push({
        id: asString(fm.id) || name.replace(/\.md$/, ""),
        requestId,
        kind: asLogKind(fm.kind),
        at: asString(fm.at),
        title: asString(fm.title),
        summary: extractMarkdownBody(raw),
        person: asPerson(fm.person),
        repo: asString(fm.repo),
        provider: asString(fm.provider),
        fromBranch: asString(fm.from),
        toBranch: asString(fm.to),
        shas: asStringArray(fm.shas),
        targets: asStringArray(fm.targets),
        filePath,
      })
    } catch {
      // A malformed log entry never hides the rest of the log.
    }
  }
  return entries.sort(
    (a, b) => b.at.localeCompare(a.at) || b.filePath.localeCompare(a.filePath)
  )
}

function readEpicId(epicDir: string): string {
  try {
    const fm = extractFrontmatter(
      fs.readFileSync(path.join(epicDir, "epic.md"), "utf8")
    )
    return fm ? asString(fm.id) : ""
  } catch {
    return ""
  }
}

function deriveStatus(
  leafCount: number,
  doneLeafCount: number,
  startedLeafCount: number
): RequestStatus {
  if (leafCount === 0) return "proposed"
  if (doneLeafCount === leafCount) return "shipped"
  if (startedLeafCount > 0) return "building"
  return "ready"
}

/** Parse every request on a board (requests/<slug>/brief.md). */
export function parseRequestsForProject(
  project: DiscoveredProject,
  index?: BoardIndex
): ProjectRequestList {
  const boardPath = project.boardPath
  const boardIndex = index ?? buildBoardIndex(boardPath)
  const requests: RequestSummary[] = []
  const logByRequest: Record<string, RequestLogEntry[]> = {}
  const errors: RequestParseError[] = []
  const epicLocations = listEpicFolderLocations(boardPath)

  for (const slug of listRequestSlugs(boardPath)) {
    const requestDir = path.join(boardPath, REQUESTS_DIR, slug)
    const filePath = path.join(requestDir, REQUEST_BRIEF_FILE)

    let raw: string
    let fm: Record<string, unknown> | null
    try {
      raw = fs.readFileSync(filePath, "utf8")
      fm = extractFrontmatter(raw)
    } catch (err) {
      errors.push({
        filePath,
        projectId: project.id,
        projectName: project.name,
        message: err instanceof Error ? err.message : "Invalid brief",
      })
      continue
    }
    if (!fm) {
      errors.push({
        filePath,
        projectId: project.id,
        projectName: project.name,
        message: "Missing YAML frontmatter",
      })
      continue
    }

    const id = asString(fm.id).trim() || `R-${slug}`
    const sections = extractSections(extractMarkdownBody(raw))

    const prefix = requestDir + path.sep
    const leaves = boardIndex.leaves.filter((leaf) => leaf.filePath.startsWith(prefix))
    const stages: (Stage | null)[] = []
    const stageCounts = emptyStageCounts()
    let points = 0
    let shippedPoints = 0
    let doneLeafCount = 0
    let startedLeafCount = 0
    let shippedLeafCount = 0
    for (const leaf of leaves) {
      const stage = parseStage(leaf.frontmatter.stage)
      const leafPts = leafPoints(leaf.frontmatter)
      stages.push(stage)
      stageCounts[stage ?? "none"] += 1
      points += leafPts
      if (isLeafDone(leaf.frontmatter)) doneLeafCount += 1
      if (isLeafStarted(leaf.frontmatter)) startedLeafCount += 1
      if (stage === "production") {
        shippedLeafCount += 1
        shippedPoints += leafPts
      }
    }

    const epicIds = epicLocations
      .filter((loc) => loc.requestSlug === slug)
      .map((loc) => readEpicId(loc.absDir))
      .filter(Boolean)

    const owners = asContributorList(fm.owner ?? fm.owners)
    requests.push({
      id,
      slug,
      title: asString(fm.title) || slug,
      status:
        asRequestStatus(fm.status) ??
        deriveStatus(leaves.length, doneLeafCount, startedLeafCount),
      goal: getSection(sections, "Goal", "Objective"),
      why: getSection(sections, "Why", "Context", "Background"),
      doneWhen: checklistOrBullets(
        getSection(sections, "Done when", "Success metrics", "Acceptance criteria")
      ),
      outOfScope: bulletLines(getSection(sections, "Out of scope")),
      openQuestions: checklistOrBullets(getSection(sections, "Open questions")),
      requestedBy: asContributorList(fm.requested_by ?? fm.reporters),
      owners,
      created: asString(fm.created),
      updated: asString(fm.updated),
      forecast: asString(fm.forecast),
      sourceMeetings: asStringArray(fm.source_meetings),
      links: asLinks(fm.links),
      aliases: asStringArray(fm.aliases),
      epicIds,
      leafCount: leaves.length,
      doneLeafCount,
      shippedLeafCount,
      points,
      shippedPoints,
      stage: rollupStage(stages),
      stageCounts,
      filePath,
      project: {
        id: project.id,
        name: project.name,
        projectPath: project.projectPath,
        boardPath: project.boardPath,
      },
    })
    logByRequest[id] = parseRequestLog(requestDir, id)
  }

  requests.sort((a, b) => a.title.localeCompare(b.title))
  return { project, requests, logByRequest, errors }
}

/** Find a request by id or alias (e.g. the epic id it was migrated from). */
export function findRequest(
  list: ProjectRequestList,
  idOrAlias: string
): RequestSummary | null {
  const key = idOrAlias.trim()
  return (
    list.requests.find((r) => r.id === key || r.aliases.includes(key) || r.slug === key) ??
    null
  )
}
