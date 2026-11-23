import fs from "node:fs"
import path from "node:path"

import { MEETINGS_DIR } from "@/lib/taskmark/board-layout"
import { buildBoardIndex, type BoardIndex } from "@/lib/taskmark/board-index"
import {
  asNumberOrNull,
  asString,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import { asContributorList } from "@/lib/taskmark/identity"
import {
  cell,
  extractMarkdownBody,
  extractSections,
  getSection,
  parseMarkdownTable,
  tableRowsAsObjects,
} from "@/lib/taskmark/parse-sections"
import { bulletLines } from "@/lib/taskmark/parse-requests"
import type {
  MeetingDecision,
  MeetingRequestLink,
  MeetingSummary,
  MeetingTask,
  MeetingTaskStatus,
  ProjectMeetingList,
  RequestParseError,
} from "@/lib/taskmark/request-types"
import { parseStage } from "@/lib/taskmark/stage"
import type { DiscoveredProject } from "@/lib/taskmark/types"

/**
 * Meetings live in `meetings/<date>-<slug>.md`. Frontmatter holds id, title,
 * date, people, source, review_state and the requests the meeting touched.
 * The body has `## Summary`, `## Decisions` (table: Decision | Request),
 * `## Tasks` (table: ID | Task | Owner | Due | Request | Item | Status) and
 * `## Notes`.
 */

function asMeetingRequests(value: unknown): MeetingRequestLink[] {
  if (!Array.isArray(value)) return []
  const out: MeetingRequestLink[] = []
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim()) {
      out.push({ request: entry.trim(), relation: "discussed" })
    } else if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>
      const request = asString(record.request ?? record.id).trim()
      if (request) {
        out.push({
          request,
          relation: asString(record.relation, "discussed").trim() || "discussed",
        })
      }
    }
  }
  return out
}

function asTaskStatus(value: string): MeetingTaskStatus {
  const v = value.trim().toLowerCase().replace(/\s+/g, "_")
  if (v === "done" || v === "x" || v === "yes") return "done"
  if (v === "in_progress" || v === "doing" || v === "started") return "in_progress"
  if (v === "cancelled" || v === "canceled" || v === "dropped") return "cancelled"
  return "open"
}

function clean(value: string): string {
  const v = value.trim()
  return v === "—" || v === "-" ? "" : v
}

function parseDecisions(markdown: string): MeetingDecision[] {
  const rows = tableRowsAsObjects(parseMarkdownTable(markdown))
  if (rows.length > 0) {
    return rows
      .map((row) => ({
        text: clean(cell(row, "decision", "text")),
        request: clean(cell(row, "request")),
      }))
      .filter((d) => d.text)
  }
  return bulletLines(markdown).map((text) => ({ text, request: "" }))
}

function parseTasks(markdown: string, index: BoardIndex): MeetingTask[] {
  const stageById = new Map<string, ReturnType<typeof parseStage>>()
  for (const leaf of index.leaves) {
    stageById.set(asString(leaf.frontmatter.id), parseStage(leaf.frontmatter.stage))
  }
  return tableRowsAsObjects(parseMarkdownTable(markdown))
    .map((row) => {
      const item = clean(cell(row, "item"))
      return {
        id: clean(cell(row, "id")),
        title: clean(cell(row, "task", "title")),
        owner: clean(cell(row, "owner", "who")),
        due: clean(cell(row, "due")),
        request: clean(cell(row, "request")),
        item,
        status: asTaskStatus(cell(row, "status")),
        stage: item ? stageById.get(item) ?? null : null,
      }
    })
    .filter((task) => task.title)
}

/** Parse every meeting on a board, newest first. */
export function parseMeetingsForProject(
  project: DiscoveredProject,
  index?: BoardIndex
): ProjectMeetingList {
  const dir = path.join(project.boardPath, MEETINGS_DIR)
  const boardIndex = index ?? buildBoardIndex(project.boardPath)
  const meetings: MeetingSummary[] = []
  const errors: RequestParseError[] = []

  let names: string[]
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith(".md") && !n.startsWith("."))
  } catch {
    return { project, meetings, errors }
  }

  for (const name of names) {
    const filePath = path.join(dir, name)
    try {
      const raw = fs.readFileSync(filePath, "utf8")
      const fm = extractFrontmatter(raw) ?? {}
      const sections = extractSections(extractMarkdownBody(raw))
      const fallbackId = `M-${name.replace(/\.md$/, "")}`
      meetings.push({
        id: asString(fm.id) || fallbackId,
        title: asString(fm.title) || name.replace(/\.md$/, ""),
        date: asString(fm.date) || name.slice(0, 10),
        durationMinutes: asNumberOrNull(fm.duration_minutes),
        people: asContributorList(fm.people),
        source: asString(fm.source),
        reviewState: asString(fm.review_state, "needs_review"),
        summary: getSection(sections, "Summary"),
        requests: asMeetingRequests(fm.requests),
        decisions: parseDecisions(getSection(sections, "Decisions")),
        tasks: parseTasks(getSection(sections, "Tasks", "Action items"), boardIndex),
        notes: getSection(sections, "Notes"),
        filePath,
      })
    } catch (err) {
      errors.push({
        filePath,
        projectId: project.id,
        projectName: project.name,
        message: err instanceof Error ? err.message : "Invalid meeting file",
      })
    }
  }

  meetings.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
  return { project, meetings, errors }
}
