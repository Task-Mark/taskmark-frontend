import fs from "node:fs"
import path from "node:path"

import {
  LEGACY_EPICS_DIR,
  listEpicFolderLocations,
} from "@/lib/taskmark/board-layout"
import { buildBoardIndex, type BoardIndex, type IndexedLeaf } from "@/lib/taskmark/board-index"
import { leafPoints } from "@/lib/taskmark/derive-parents"
import { asString, extractFrontmatter } from "@/lib/taskmark/frontmatter"
import { asContributorList } from "@/lib/taskmark/identity"
import { parseMeetingsForProject } from "@/lib/taskmark/parse-meetings"
import { parseRequestsForProject } from "@/lib/taskmark/parse-requests"
import { extractMarkdownBody } from "@/lib/taskmark/parse-sections"
import type {
  RequestBoardData,
  RequestDetail,
  RequestEpic,
  RequestLeaf,
  RequestStory,
} from "@/lib/taskmark/request-types"
import { parseStage, rollupStage } from "@/lib/taskmark/stage"
import type { DiscoveredProject } from "@/lib/taskmark/types"

type Meta = { id: string; title: string; status: string }

function readMeta(file: string): Meta | null {
  try {
    const fm = extractFrontmatter(fs.readFileSync(file, "utf8"))
    if (!fm) return null
    const id = asString(fm.id)
    if (!id) return null
    return { id, title: asString(fm.title) || id, status: asString(fm.status) || "backlog" }
  } catch {
    return null
  }
}

function listDirs(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort()
  } catch {
    return []
  }
}

function toLeaf(indexed: IndexedLeaf): RequestLeaf {
  const fm = indexed.frontmatter
  const type = asString(fm.type).toLowerCase()
  return {
    id: asString(fm.id),
    kind: type === "bug" ? "bug" : "task",
    title: asString(fm.title) || asString(fm.id),
    status: asString(fm.status) || "backlog",
    stage: parseStage(fm.stage),
    points: leafPoints(fm),
    storyId: asString(fm.parent) === asString(fm.epic) ? "" : asString(fm.parent),
    startedAt: asString(fm.started_at),
    completedAt: asString(fm.completed_at),
    shippedAt: asString(fm.shipped_at),
    resolvers: asContributorList(fm.resolvers),
  }
}

function byId(a: { id: string }, b: { id: string }): number {
  return a.id.localeCompare(b.id, undefined, { numeric: true })
}

/** Epics, stories and leaves under one request folder. */
function buildTree(
  boardPath: string,
  slug: string,
  index: BoardIndex
): RequestEpic[] {
  const epics: RequestEpic[] = []
  for (const loc of listEpicFolderLocations(boardPath)) {
    if (loc.requestSlug !== slug) continue
    const epicMeta = readMeta(path.join(loc.absDir, "epic.md"))
    if (!epicMeta) continue
    const prefix = loc.absDir + path.sep
    const leaves = index.leaves
      .filter((l) => l.filePath.startsWith(prefix))
      .map(toLeaf)
      .sort(byId)

    const stories: RequestStory[] = []
    const storyIds = new Set<string>()
    for (const name of listDirs(path.join(loc.absDir, "stories"))) {
      const meta = readMeta(path.join(loc.absDir, "stories", name, "story.md"))
      if (!meta) continue
      storyIds.add(meta.id)
      const storyLeaves = leaves.filter((l) => l.storyId === meta.id)
      stories.push({
        ...meta,
        stage: rollupStage(storyLeaves.map((l) => l.stage)),
        leaves: storyLeaves,
      })
    }
    stories.sort(byId)
    const direct = leaves.filter((l) => !l.storyId || !storyIds.has(l.storyId))
    epics.push({
      ...epicMeta,
      stage: rollupStage(leaves.map((l) => l.stage)),
      stories,
      leaves: direct,
    })
  }
  return epics.sort(byId)
}

function countLegacyLeaves(boardPath: string, index: BoardIndex): number {
  const prefix = path.join(boardPath, LEGACY_EPICS_DIR) + path.sep
  return index.leaves.filter((l) => l.filePath.startsWith(prefix)).length
}

/**
 * Request-centred view of a board for the new screens. Null when the board
 * has neither requests nor meetings yet, so callers can keep the legacy views.
 */
export function buildRequestBoard(
  project: DiscoveredProject,
  index?: BoardIndex,
  asOf: Date = new Date()
): RequestBoardData | null {
  const boardIndex = index ?? buildBoardIndex(project.boardPath)
  const list = parseRequestsForProject(project, boardIndex)
  const meetings = parseMeetingsForProject(project, boardIndex)
  if (list.requests.length === 0 && meetings.meetings.length === 0) return null

  const requests: RequestDetail[] = list.requests.map((summary) => {
    let briefMarkdown = ""
    try {
      briefMarkdown = extractMarkdownBody(fs.readFileSync(summary.filePath, "utf8"))
    } catch {
      // The summary already reported the brief as unreadable.
    }
    return {
      ...summary,
      epics: buildTree(project.boardPath, summary.slug, boardIndex),
      log: list.logByRequest[summary.id] ?? [],
      briefPath: path.relative(project.boardPath, summary.filePath),
      briefMarkdown,
    }
  })

  return {
    asOf: asOf.toISOString().slice(0, 10),
    requests,
    meetings: meetings.meetings,
    legacyLeafCount: countLegacyLeaves(project.boardPath, boardIndex),
    errors: [...list.errors, ...meetings.errors],
  }
}
