import {
  asNumberOrNull,
  asString,
  asStringArray,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import { asContributorList } from "@/lib/taskmark/identity"
import { readActualTimingFromWorkLog } from "@/lib/taskmark/timing"
import type {
  CommitRow,
  EpicDetail,
  ItemDetail,
  PromptFeedbackRow,
  StoryDetail,
  WorkItemDetailResult,
  WorkItemKind,
  WorkItemMeta,
  WorkLogRow,
} from "@/lib/taskmark/detail-types"
import {
  cell,
  extractMarkdownBody,
  extractSections,
  getSection,
  parseChecklist,
  parseMarkdownTable,
  tableRowsAsObjects,
} from "@/lib/taskmark/parse-sections"

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value.toLowerCase() === "true"
  return false
}

function parseCommits(section: string): CommitRow[] {
  const rows = tableRowsAsObjects(parseMarkdownTable(section))
  return rows.map((row) => ({
    sha: cell(row, "sha"),
    repo: cell(row, "repo"),
    date: cell(row, "date (utc)", "date"),
    author: cell(row, "author"),
    message: cell(row, "message"),
  }))
}

function parseWorkLog(section: string): WorkLogRow[] {
  const rows = tableRowsAsObjects(parseMarkdownTable(section))
  return rows.map((row) => ({
    session: cell(row, "session"),
    actor: cell(row, "actor"),
    started: cell(row, "started (utc)", "started"),
    ended: cell(row, "ended (utc)", "ended"),
    summary: cell(row, "summary"),
  }))
}

function parsePromptFeedback(section: string): PromptFeedbackRow[] {
  const rows = tableRowsAsObjects(parseMarkdownTable(section))
  return rows.map((row) => ({
    index: cell(row, "#", "index"),
    when: cell(row, "when (utc)", "when"),
    kind: cell(row, "kind"),
    author: cell(row, "author"),
    summary: cell(row, "summary"),
  }))
}

function resolveKind(
  frontmatter: Record<string, unknown>,
  id: string,
  hint?: "epic" | "story" | "item"
): WorkItemKind {
  const typed = asString(frontmatter.type).toLowerCase()
  if (typed === "epic" || typed === "story" || typed === "task" || typed === "bug") {
    return typed
  }
  if (hint === "epic") return "epic"
  if (hint === "story") return "story"
  if (id.startsWith("B-")) return "bug"
  if (id.startsWith("E-")) return "epic"
  if (id.startsWith("S-")) return "story"
  return "task"
}

function buildMeta(
  frontmatter: Record<string, unknown>,
  raw: string,
  filePath: string,
  kind: WorkItemKind
): WorkItemMeta | null {
  const id = asString(frontmatter.id)
  const title = asString(frontmatter.title)
  if (!id || !title) return null

  const timing = readActualTimingFromWorkLog(raw)
  return {
    id,
    title,
    type: kind,
    status: asString(frontmatter.status, "unknown"),
    priority: asString(frontmatter.priority, "medium"),
    size: asString(frontmatter.size, "—"),
    points: asNumberOrNull(frontmatter.points),
    actualMinutes: timing.actualMinutes,
    actualMs: timing.actualMs,
    tags: asStringArray(frontmatter.tags),
    reporters: asContributorList(frontmatter.reporters),
    resolvers: asContributorList(frontmatter.resolvers),
    blocked: asBool(frontmatter.blocked),
    cancelled: asBool(frontmatter.cancelled),
    parent: asString(frontmatter.parent),
    epic: asString(frontmatter.epic),
    created: asString(frontmatter.created),
    updated: asString(frontmatter.updated),
    startedAt: asString(frontmatter.started_at),
    completedAt: asString(frontmatter.completed_at),
    filePath,
  }
}

export function parseWorkItemDetailFromRaw(
  raw: string,
  filePath: string,
  hint?: "epic" | "story" | "item"
): WorkItemDetailResult {
  let frontmatter: Record<string, unknown> | null
  try {
    frontmatter = extractFrontmatter(raw)
  } catch (err) {
    return {
      ok: false,
      filePath,
      message:
        err instanceof Error ? err.message : "Invalid YAML frontmatter",
    }
  }

  if (!frontmatter) {
    return {
      ok: false,
      filePath,
      message: "Missing or invalid YAML frontmatter",
    }
  }

  const id = asString(frontmatter.id)
  const kind = resolveKind(frontmatter, id, hint)
  const meta = buildMeta(frontmatter, raw, filePath, kind)
  if (!meta) {
    return {
      ok: false,
      filePath,
      message: "Frontmatter requires id and title",
    }
  }

  const body = extractMarkdownBody(raw)
  const sections = extractSections(body)

  if (kind === "epic") {
    const detail: EpicDetail = {
      ...meta,
      type: "epic",
      goal: getSection(sections, "Goal"),
      scope: getSection(sections, "Scope"),
      outOfScope: getSection(sections, "Out of scope"),
      successMetrics: getSection(sections, "Success metrics"),
      storiesMarkdown: getSection(sections, "Stories"),
      children: [],
      promptFeedback: [],
      commits: parseCommits(getSection(sections, "Commits")),
      workLog: parseWorkLog(getSection(sections, "Work log")),
    }
    return { ok: true, detail }
  }

  if (kind === "story") {
    const acRaw = getSection(sections, "Acceptance criteria")
    const detail: StoryDetail = {
      ...meta,
      type: "story",
      userStory: getSection(sections, "User story"),
      acceptanceCriteria: parseChecklist(acRaw),
      acceptanceCriteriaRaw: acRaw,
      tasksMarkdown: getSection(sections, "Tasks"),
      children: [],
      promptFeedback: parsePromptFeedback(
        getSection(sections, "Prompt & feedback log", "Prompt & feedback")
      ),
      commits: parseCommits(getSection(sections, "Commits")),
      workLog: parseWorkLog(getSection(sections, "Work log")),
    }
    return { ok: true, detail }
  }

  const detail: ItemDetail = {
    ...meta,
    type: kind === "bug" ? "bug" : "task",
    description: getSection(sections, "Description"),
    acceptanceCriteria:
      kind === "bug" ? [] : parseChecklist(getSection(sections, "Acceptance criteria")),
    acceptanceCriteriaRaw:
      kind === "bug" ? "" : getSection(sections, "Acceptance criteria"),
    reproSteps: kind === "bug" ? getSection(sections, "Repro steps") : "",
    fixCriteria: kind === "bug" ? getSection(sections, "Fix criteria") : "",
    notes: getSection(sections, "Notes"),
    promptFeedback: parsePromptFeedback(
      getSection(sections, "Prompt & feedback log", "Prompt & feedback")
    ),
    commits: parseCommits(getSection(sections, "Commits")),
    workLog: parseWorkLog(getSection(sections, "Work log")),
  }

  // For bugs, also try parsing fix criteria as checklist when checkbox-shaped
  if (kind === "bug") {
    const fixRaw = getSection(sections, "Fix criteria")
    detail.fixCriteria = fixRaw
    const fixChecks = parseChecklist(fixRaw)
    if (fixChecks.length > 0) {
      detail.acceptanceCriteria = fixChecks
      detail.acceptanceCriteriaRaw = fixRaw
    }
  }

  return { ok: true, detail }
}
