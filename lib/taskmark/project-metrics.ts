/**
 * Project status metrics for the board overview (E-015).
 * Counts stories/tasks/bugs; Current Speed = 90-day weekly points average.
 */

import { addDays } from "date-fns"

import type { ContributorIdentity } from "@/lib/taskmark/identity"
import type { BoardIndex } from "@/lib/taskmark/board-index"
import { parseEpicsForProject } from "@/lib/taskmark/parse-epics"
import { parseItemsForEpic, parseItemsForStory } from "@/lib/taskmark/parse-items"
import { parseStoriesForEpic } from "@/lib/taskmark/parse-stories"
import type { DiscoveredProject } from "@/lib/taskmark/types"
import { parseTaskmarkDate } from "@/lib/format-date"
import {
  isoWeekCountKey,
  isoWeekParts,
  shiftIsoWeek,
  type SolvedCompletionSample,
} from "@/lib/taskmark/timeframe-filters"

export type {
  ProjectStatusMetrics,
} from "@/lib/taskmark/project-metrics-shared"
export { formatSpeedPtsPerWeek } from "@/lib/taskmark/project-metrics-shared"
import type { ProjectStatusMetrics } from "@/lib/taskmark/project-metrics-shared"

export type MetricLeafKind = "epic" | "story" | "task" | "bug"

export type MetricLeaf = {
  kind: MetricLeafKind
  id: string
  status: string
  points: number
  completedAt: string
  reporters: ContributorIdentity[]
  resolvers: ContributorIdentity[]
}

const COUNTABLE_KINDS = new Set<MetricLeafKind>(["story", "task", "bug"])

function emailKey(email: string, name: string): string {
  const e = email.trim().toLowerCase()
  if (e) return `e:${e}`
  return `n:${name.trim().toLowerCase()}`
}

/** Merge identities by email (prefer richer name/initials). */
export function collectUniqueContributors(
  leaves: readonly MetricLeaf[]
): ContributorIdentity[] {
  const map = new Map<string, ContributorIdentity>()
  for (const leaf of leaves) {
    for (const person of [...leaf.reporters, ...leaf.resolvers]) {
      const key = emailKey(person.email, person.name)
      const cur = map.get(key)
      if (!cur) {
        map.set(key, { ...person })
        continue
      }
      if (!cur.name && person.name) cur.name = person.name
      if (!cur.email && person.email) cur.email = person.email
      if (!cur.initials && person.initials) cur.initials = person.initials
    }
  }
  return [...map.values()].sort((a, b) => {
    const an = (a.name || a.email).toLowerCase()
    const bn = (b.name || b.email).toLowerCase()
    if (an !== bn) return an < bn ? -1 : 1
    return (a.email || "").localeCompare(b.email || "")
  })
}

/**
 * Total / complete counts for stories + bugs + tasks.
 * Excludes epics and cancelled items.
 */
export function aggregateWorkItemCounts(leaves: readonly MetricLeaf[]): {
  total: number
  complete: number
} {
  let total = 0
  let complete = 0
  for (const leaf of leaves) {
    if (!COUNTABLE_KINDS.has(leaf.kind)) continue
    const status = leaf.status.trim().toLowerCase()
    if (status === "cancelled") continue
    total += 1
    if (status === "done") complete += 1
  }
  return { total, complete }
}

/** ISO weeks from `from` through `to` inclusive (by week of each date). */
export function isoWeeksInclusive(
  from: Date,
  to: Date
): { year: number; week: number }[] {
  const start = from.getTime() <= to.getTime() ? from : to
  const end = from.getTime() <= to.getTime() ? to : from
  let { year, week } = isoWeekParts(start)
  const endParts = isoWeekParts(end)
  const out: { year: number; week: number }[] = []
  // Safety cap (~3 years of weeks)
  for (let i = 0; i < 200; i++) {
    out.push({ year, week })
    if (year === endParts.year && week === endParts.week) break
    const next = shiftIsoWeek(year, week, 1)
    year = next.year
    week = next.week
  }
  return out
}

function isCompletedTaskBugLeaf(leaf: MetricLeaf): boolean {
  if (leaf.kind !== "task" && leaf.kind !== "bug") return false
  if (leaf.status.trim().toLowerCase() !== "done") return false
  if (!leaf.completedAt.trim()) return false
  return true
}

/** The exact completed task/bug leaf set used by Current Speed. */
export function collectCompletedLeafPointSamples(
  leaves: readonly MetricLeaf[]
): SolvedCompletionSample[] {
  return leaves
    .filter(isCompletedTaskBugLeaf)
    .map((leaf) => ({
      completedAt: leaf.completedAt,
      points: leaf.points,
    }))
}

/**
 * Current Speed: average weekly story points of done tasks/bugs.
 *
 * - Anchor = most recently completed task/bug (`completed_at`); look back 90 days.
 * - Exclude the **current** ISO week (incomplete / in progress).
 * - Exclude weeks with **0** points (idle/hold — not in numerator or denominator).
 * - Average = sum(non-zero past weeks) / count(those weeks).
 */
export function computeCurrentSpeedPtsPerWeek(
  leaves: readonly MetricLeaf[],
  now: Date = new Date()
): { average: number | null; weekCount: number } {
  const doneLeaves = leaves.filter(isCompletedTaskBugLeaf)

  let latest: Date | null = null
  for (const leaf of doneLeaves) {
    const d = parseTaskmarkDate(leaf.completedAt)
    if (!d) continue
    if (!latest || d.getTime() > latest.getTime()) latest = d
  }
  if (!latest) return { average: null, weekCount: 0 }

  const windowStart = addDays(latest, -90)
  const weeks = isoWeeksInclusive(windowStart, latest)
  if (weeks.length === 0) return { average: null, weekCount: 0 }

  const current = isoWeekParts(now)
  const currentKey = isoWeekCountKey(current.year, current.week)

  const pointsByWeek = new Map<string, number>()
  for (const w of weeks) {
    const key = isoWeekCountKey(w.year, w.week)
    if (key === currentKey) continue // ignore current week
    pointsByWeek.set(key, 0)
  }

  for (const leaf of doneLeaves) {
    const d = parseTaskmarkDate(leaf.completedAt)
    if (!d) continue
    if (d.getTime() < windowStart.getTime() || d.getTime() > latest.getTime()) {
      continue
    }
    const { year, week } = isoWeekParts(d)
    const key = isoWeekCountKey(year, week)
    if (!pointsByWeek.has(key)) continue
    const pts = Number.isFinite(leaf.points) ? Math.max(0, leaf.points) : 0
    pointsByWeek.set(key, (pointsByWeek.get(key) ?? 0) + pts)
  }

  // Only weeks with completed points contribute to the average
  const considered = [...pointsByWeek.values()].filter((pts) => pts > 0)
  if (considered.length === 0) return { average: null, weekCount: 0 }

  const sum = considered.reduce((a, b) => a + b, 0)
  return { average: sum / considered.length, weekCount: considered.length }
}

export function computeCurrentWeekPointsDone(
  leaves: readonly MetricLeaf[],
  now: Date = new Date()
): number {
  const current = isoWeekParts(now)
  let total = 0
  for (const leaf of leaves) {
    if (!isCompletedTaskBugLeaf(leaf)) continue
    const date = parseTaskmarkDate(leaf.completedAt)
    if (!date) continue
    const parts = isoWeekParts(date)
    if (parts.year !== current.year || parts.week !== current.week) continue
    total += Number.isFinite(leaf.points) ? Math.max(0, leaf.points) : 0
  }
  return total
}

/** Walk the board and collect metric leaves (stories, tasks, bugs + epic identities for contributors). */
export function collectMetricLeaves(
  project: DiscoveredProject,
  index?: BoardIndex
): MetricLeaf[] {
  const epicList = parseEpicsForProject(project, index)
  const leaves: MetricLeaf[] = []

  for (const epic of epicList.epics) {
    leaves.push({
      kind: "epic",
      id: epic.id,
      status: epic.status,
      points: epic.points ?? 0,
      completedAt: epic.completedAt,
      reporters: epic.reporters,
      resolvers: epic.resolvers,
    })

    const storyList = parseStoriesForEpic(project, epic.id, index)
    for (const story of storyList.stories) {
      leaves.push({
        kind: "story",
        id: story.id,
        status: story.status,
        points: story.points ?? 0,
        completedAt: story.completedAt,
        reporters: story.reporters,
        resolvers: story.resolvers,
      })

      const items = parseItemsForStory(project, epic.id, story.id, index)
      for (const item of items.items) {
        leaves.push({
          kind: item.type,
          id: item.id,
          status: item.status,
          points: item.points ?? 0,
          completedAt: item.completedAt,
          reporters: item.reporters,
          resolvers: item.resolvers,
        })
      }
    }

    const epicItems = parseItemsForEpic(project, epic.id, index)
    for (const item of epicItems.items) {
      leaves.push({
        kind: item.type,
        id: item.id,
        status: item.status,
        points: item.points ?? 0,
        completedAt: item.completedAt,
        reporters: item.reporters,
        resolvers: item.resolvers,
      })
    }
  }

  return leaves
}

export function computeProjectStatusMetrics(
  project: DiscoveredProject,
  index?: BoardIndex,
  collectedLeaves?: readonly MetricLeaf[]
): ProjectStatusMetrics {
  const leaves = collectedLeaves ?? collectMetricLeaves(project, index)
  const { total, complete } = aggregateWorkItemCounts(leaves)
  const currentWeekPointsDone = computeCurrentWeekPointsDone(leaves)
  const speed = computeCurrentSpeedPtsPerWeek(leaves)
  return {
    totalWorkItems: total,
    completeWorkItems: complete,
    currentWeekPointsDone,
    currentSpeedPtsPerWeek: speed.average,
    speedWeekCount: speed.weekCount,
    contributors: collectUniqueContributors(leaves),
  }
}

