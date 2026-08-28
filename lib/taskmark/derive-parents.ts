import fs from "node:fs"
import path from "node:path"

import {
  asNumberOrNull,
  asString,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import type { ContributorIdentity } from "@/lib/taskmark/identity"
import { asContributorList } from "@/lib/taskmark/identity"
import { parseWorkItemDetailFromRaw } from "@/lib/taskmark/parse-detail"
import type {
  CommitRow,
  PromptFeedbackRow,
  WorkLogRow,
} from "@/lib/taskmark/detail-types"
import { readTimingFields } from "@/lib/taskmark/timing"

export const STATIC_SIZE_POINTS = {
  XS: 1,
  S: 3,
  M: 5,
  L: 8,
  XL: 13,
  XXL: 21,
} as const

type ParentKind = "epic" | "story"

type LeafRecord = {
  id: string
  title: string
  parent: string
  epic: string
  status: string
  points: number
  reporters: ContributorIdentity[]
  resolvers: ContributorIdentity[]
  updated: string
  startedAt: string
  completedAt: string
  estimateMinutes: number | null
  actualMinutes: number | null
  actualMs: number | null
  promptFeedback: PromptFeedbackRow[]
  commits: CommitRow[]
  workLog: WorkLogRow[]
}

export type ParentRollup = {
  status: string
  size: string
  points: number
  estimateMinutes: number
  actualMinutes: number
  actualMs: number
  resolvers: ContributorIdentity[]
  updated: string
  startedAt: string
  completedAt: string
  promptFeedback: PromptFeedbackRow[]
  commits: CommitRow[]
  workLog: WorkLogRow[]
  leafCount: number
  doneLeafCount: number
}

function markdownFilesUnder(dir: string): string[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...markdownFilesUnder(filePath))
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(filePath)
  }
  return files
}

function leafPoints(frontmatter: Record<string, unknown>): number {
  const explicit = asNumberOrNull(frontmatter.points)
  if (explicit != null) return Math.max(0, explicit)
  const size = asString(frontmatter.size).trim().toUpperCase()
  return STATIC_SIZE_POINTS[size as keyof typeof STATIC_SIZE_POINTS] ?? 0
}

function readLeaf(filePath: string): LeafRecord | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8")
    const frontmatter = extractFrontmatter(raw)
    if (!frontmatter) return null
    const type = asString(frontmatter.type).toLowerCase()
    if (type !== "task" && type !== "bug") return null
    const id = asString(frontmatter.id)
    if (!id) return null
    const timing = readTimingFields(frontmatter)
    const parsed = parseWorkItemDetailFromRaw(raw, filePath, "item")
    const itemDetail = parsed.ok && parsed.detail.type !== "epic" && parsed.detail.type !== "story"
      ? parsed.detail
      : null
    return {
      id,
      title: asString(frontmatter.title, id),
      parent: asString(frontmatter.parent),
      epic: asString(frontmatter.epic),
      status: asString(frontmatter.status, "backlog"),
      points: leafPoints(frontmatter),
      reporters: asContributorList(frontmatter.reporters),
      resolvers: asContributorList(frontmatter.resolvers),
      updated: asString(frontmatter.updated),
      startedAt: asString(frontmatter.started_at),
      completedAt: asString(frontmatter.completed_at),
      ...timing,
      promptFeedback: itemDetail?.promptFeedback ?? [],
      commits: itemDetail?.commits ?? [],
      workLog: itemDetail?.workLog ?? [],
    }
  } catch {
    return null
  }
}

function leavesForParent(
  boardPath: string,
  parentId: string,
  kind: ParentKind
): LeafRecord[] {
  const leaves = markdownFilesUnder(path.join(boardPath, "epics"))
    .map(readLeaf)
    .filter((leaf): leaf is LeafRecord => leaf != null)
  return leaves.filter((leaf) =>
    kind === "story"
      ? leaf.parent === parentId
      : leaf.epic === parentId || leaf.parent === parentId
  )
}

function parentStatus(leaves: readonly LeafRecord[]): string {
  if (leaves.length === 0) return "backlog"
  const statuses = leaves.map((leaf) => leaf.status.trim().toLowerCase())
  const terminal = statuses.every(
    (status) => status === "done" || status === "cancelled"
  )
  if (terminal && statuses.some((status) => status === "done")) return "done"
  if (statuses.every((status) => status === "cancelled")) return "cancelled"
  if (statuses.every((status) => status === "backlog")) return "backlog"
  return "in_progress"
}

function parentSize(points: number, leafCount: number): string {
  if (leafCount === 0) return "—"
  if (points <= 1) return "XS"
  if (points <= 3) return "S"
  if (points <= 5) return "M"
  if (points <= 8) return "L"
  if (points <= 13) return "XL"
  return "XXL"
}

function dateValue(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function selectDate(
  values: readonly string[],
  direction: "min" | "max"
): string {
  return values
    .map((value) => ({ value, time: dateValue(value) }))
    .filter((entry): entry is { value: string; time: number } => entry.time != null)
    .sort((a, b) => direction === "min" ? a.time - b.time : b.time - a.time)[0]
    ?.value ?? ""
}

function identityKey(identity: ContributorIdentity): string {
  return identity.email.trim().toLowerCase() ||
    identity.name.trim().toLowerCase()
}

function uniqueResolvers(leaves: readonly LeafRecord[]): ContributorIdentity[] {
  const identities = new Map<string, ContributorIdentity>()
  for (const leaf of leaves) {
    for (const identity of leaf.resolvers) {
      const key = identityKey(identity)
      if (key && !identities.has(key)) identities.set(key, identity)
    }
  }
  return [...identities.values()]
}

function withLeaf<T extends object>(
  leaf: LeafRecord,
  rows: readonly T[]
): (T & { leafId: string; leafTitle: string })[] {
  return rows.map((row) => ({
    ...row,
    leafId: leaf.id,
    leafTitle: leaf.title,
  }))
}

function sortByDate<T>(rows: T[], date: (row: T) => string): T[] {
  return rows.sort((a, b) => {
    const left = dateValue(date(a)) ?? Number.MAX_SAFE_INTEGER
    const right = dateValue(date(b)) ?? Number.MAX_SAFE_INTEGER
    return left - right
  })
}

/** Derive every mutable parent field exclusively from task/bug leaves. */
export function deriveParentRollup(
  boardPath: string,
  parentId: string,
  kind: ParentKind
): ParentRollup {
  const leaves = leavesForParent(boardPath, parentId, kind)
  const status = parentStatus(leaves)
  const points = leaves.reduce((sum, leaf) => sum + leaf.points, 0)
  const actualMs = leaves.reduce(
    (sum, leaf) =>
      sum + (leaf.actualMs ?? (leaf.actualMinutes ?? 0) * 60_000),
    0
  )
  const doneLeaves = leaves.filter(
    (leaf) => leaf.status.trim().toLowerCase() === "done"
  )

  return {
    status,
    size: parentSize(points, leaves.length),
    points,
    estimateMinutes: leaves.reduce(
      (sum, leaf) => sum + (leaf.estimateMinutes ?? 0),
      0
    ),
    actualMinutes: Math.floor(actualMs / 60_000),
    actualMs,
    resolvers: uniqueResolvers(leaves),
    updated: selectDate(leaves.map((leaf) => leaf.updated), "max"),
    startedAt: selectDate(leaves.map((leaf) => leaf.startedAt), "min"),
    completedAt:
      status === "done"
        ? selectDate(doneLeaves.map((leaf) => leaf.completedAt), "max")
        : "",
    promptFeedback: sortByDate(
      leaves.flatMap((leaf) => withLeaf(leaf, leaf.promptFeedback)),
      (row) => row.when
    ),
    commits: sortByDate(
      leaves.flatMap((leaf) => withLeaf(leaf, leaf.commits)),
      (row) => row.date
    ),
    workLog: sortByDate(
      leaves.flatMap((leaf) => withLeaf(leaf, leaf.workLog)),
      (row) => row.started
    ),
    leafCount: leaves.length,
    doneLeafCount: doneLeaves.length,
  }
}
