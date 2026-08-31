import fs from "node:fs"
import path from "node:path"

import { loadWorkItemDetailSync } from "@/lib/taskmark/detail-load"
import { buildBoardIndex } from "@/lib/taskmark/board-index"
import type { WorkItemRef } from "@/lib/taskmark/detail-types"
import { parseEpicsForProject } from "@/lib/taskmark/parse-epics"
import { parseWorkItemsForEpic, parseWorkItemsViewForProject } from "@/lib/taskmark/parse-flat-lists"
import { parseItemsForStory } from "@/lib/taskmark/parse-items"
import {
  collectCompletedLeafPointSamples,
  collectMetricLeaves,
  computeProjectStatusMetrics,
} from "@/lib/taskmark/project-metrics"
import {
  type BoardSnapshot,
  storyKey,
} from "@/lib/taskmark/snapshot-types"
import type { DiscoveredProject } from "@/lib/taskmark/types"
import { loadBoardChangelogMarkdown } from "@/lib/taskmark/load-changelog"
import { loadBoardReports } from "@/lib/taskmark/load-reports"
import { loadWorkspace } from "@/lib/taskmark/workspace"
import { asString, extractFrontmatter } from "@/lib/taskmark/frontmatter"

function toRef(
  meta: { id: string; title: string; type: string },
  filePath: string
): WorkItemRef {
  const type = meta.type.toLowerCase()
  if (type === "epic") {
    return { kind: "epic", id: meta.id, title: meta.title, filePath }
  }
  if (type === "story") {
    return { kind: "story", id: meta.id, title: meta.title, filePath }
  }
  const itemType = type === "bug" ? "bug" : "task"
  return {
    kind: "item",
    id: meta.id,
    title: meta.title,
    filePath,
    itemType,
  }
}

function readMeta(
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

/** Walk one board and collect every work-item ref. */
export function listAllWorkItemRefs(boardPath: string): WorkItemRef[] {
  const refs: WorkItemRef[] = []
  const epicsDir = path.join(boardPath, "epics")
  let epicEntries: fs.Dirent[]
  try {
    epicEntries = fs.readdirSync(epicsDir, { withFileTypes: true })
  } catch {
    return refs
  }

  for (const epicEntry of epicEntries) {
    if (!epicEntry.isDirectory() || epicEntry.name.startsWith(".")) continue
    const epicDir = path.join(epicsDir, epicEntry.name)

    const epicFile = path.join(epicDir, "epic.md")
    if (fs.existsSync(epicFile)) {
      const meta = readMeta(epicFile)
      if (meta) refs.push(toRef(meta, epicFile))
    }

    const epicItemsDir = path.join(epicDir, "items")
    try {
      for (const name of fs.readdirSync(epicItemsDir)) {
        if (!name.endsWith(".md") || name.startsWith(".")) continue
        const filePath = path.join(epicItemsDir, name)
        const meta = readMeta(filePath)
        if (meta) refs.push(toRef(meta, filePath))
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
        const meta = readMeta(storyFile)
        if (meta) refs.push(toRef(meta, storyFile))
      }

      const storyItemsDir = path.join(storyDir, "items")
      try {
        for (const name of fs.readdirSync(storyItemsDir)) {
          if (!name.endsWith(".md") || name.startsWith(".")) continue
          const filePath = path.join(storyItemsDir, name)
          const meta = readMeta(filePath)
          if (meta) refs.push(toRef(meta, filePath))
        }
      } catch {
        /* no story items */
      }
    }
  }

  return refs
}

export function buildBoardSnapshot(
  projects: DiscoveredProject[],
  active: DiscoveredProject
): BoardSnapshot {
  const boardIndex = buildBoardIndex(active.boardPath)
  const epics = parseEpicsForProject(active, boardIndex)
  const workItemsByEpic: BoardSnapshot["workItemsByEpic"] = {}
  const itemsByStory: BoardSnapshot["itemsByStory"] = {}

  for (const epic of epics.epics) {
    const epicList = parseWorkItemsForEpic(
      active,
      epic.id,
      epic.title,
      boardIndex
    )
    workItemsByEpic[epic.id] = epicList
    for (const row of epicList.rows) {
      if (row.kind !== "story") continue
      itemsByStory[storyKey(epic.id, row.id)] = parseItemsForStory(
        active,
        epic.id,
        row.id,
        boardIndex
      )
    }
  }

  const refs = listAllWorkItemRefs(active.boardPath)
  const refsById: BoardSnapshot["refsById"] = {}
  const detailsByPath: BoardSnapshot["detailsByPath"] = {}

  for (const ref of refs) {
    refsById[ref.id] = ref
    const hint =
      ref.kind === "epic" ? "epic" : ref.kind === "story" ? "story" : "item"
    const detail = loadWorkItemDetailSync(
      projects,
      ref.filePath,
      hint,
      boardIndex
    )
    if (detail.ok) {
      detailsByPath[ref.filePath] = detail.detail
    }
  }

  const hideCompletedDefaults = {
    epics: false,
    stories: false,
    tasks: false,
    overallWorkItems: false,
    workItems: false,
  } as const

  const metricLeaves = collectMetricLeaves(active, boardIndex)

  return {
    version: 1,
    builtAt: new Date().toISOString(),
    project: active,
    projects,
    epics,
    workItemsView: parseWorkItemsViewForProject(active, boardIndex),
    workItemsByEpic,
    itemsByStory,
    statusMetrics: computeProjectStatusMetrics(
      active,
      boardIndex,
      metricLeaves
    ),
    countableCompletions: collectCompletedLeafPointSamples(
      metricLeaves
    ),
    changelogMarkdown: loadBoardChangelogMarkdown(active.boardPath),
    reports: loadBoardReports(active.boardPath),
    hideCompletedDefaults: { ...hideCompletedDefaults },
    detailsByPath,
    refsById,
  }
}

/** Build snapshot from env/cwd autoconfig (no cookies). */
export function buildBoardSnapshotFromEnv(): BoardSnapshot {
  const workspace = loadWorkspace([])
  if (workspace.projects.length === 0) {
    throw new Error(
      "No Taskmark board found. Set TASKMARK_BOARD or run from a board / product root."
    )
  }
  const active = workspace.projects[0]!
  return buildBoardSnapshot(workspace.projects, active)
}
