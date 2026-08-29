import type { ContributorIdentity } from "@/lib/taskmark/identity"
import type { EpicSummary, ProjectEpicList } from "@/lib/taskmark/epic-types"
import type {
  EpicWorkItemsList,
  WorkItemsViewRow,
} from "@/lib/taskmark/flat-work-item-types"
import type { ItemSummary, StoryItemList } from "@/lib/taskmark/item-types"
import { isGeneralEpic } from "@/lib/taskmark/general-epic"
import {
  matchesWorkItemSearch,
  type TimeframeFilterState,
} from "@/lib/taskmark/list-filters"
import { passesTimeframeFilter } from "@/lib/taskmark/timeframe-filters"

export type OverallTreeNode = {
  kind: "epic" | "story" | "task" | "bug"
  id: string
  title: string
  status: string
  size: string
  points: number | null
  tags: string[]
  reporters: ContributorIdentity[]
  resolvers: ContributorIdentity[]
  created: string
  updated: string
  completedAt: string
  filePath: string
  children: OverallTreeNode[]
  workItemCount: number
  doneWorkItemCount: number
}

export function isOverallNodeComplete(status: string): boolean {
  const normalized = status.trim().toLowerCase()
  return normalized === "done" || normalized === "cancelled"
}

function timestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Incomplete first, then created/updated newest-first, then id. */
export function compareOverallNodes(
  a: Pick<OverallTreeNode, "status" | "created" | "updated" | "id">,
  b: Pick<OverallTreeNode, "status" | "created" | "updated" | "id">
): number {
  const completion = Number(isOverallNodeComplete(a.status)) -
    Number(isOverallNodeComplete(b.status))
  if (completion !== 0) return completion
  const created = timestamp(b.created) - timestamp(a.created)
  if (created !== 0) return created
  const updated = timestamp(b.updated) - timestamp(a.updated)
  if (updated !== 0) return updated
  return a.id.localeCompare(b.id)
}

function itemNode(item: ItemSummary): OverallTreeNode {
  return {
    kind: item.type,
    id: item.id,
    title: item.title,
    status: item.status,
    size: item.size,
    points: item.points,
    tags: item.tags,
    reporters: item.reporters,
    resolvers: item.resolvers,
    created: item.created,
    updated: item.updated,
    completedAt: item.completedAt,
    filePath: item.filePath,
    children: [],
    workItemCount: 0,
    doneWorkItemCount: 0,
  }
}

function workItemNode(
  row: WorkItemsViewRow,
  storyItems: StoryItemList | undefined
): OverallTreeNode {
  const children =
    row.kind === "story"
      ? (storyItems?.items ?? []).map(itemNode).sort(compareOverallNodes)
      : []
  return {
    kind: row.kind,
    id: row.id,
    title: row.title,
    status: row.status,
    size: row.size,
    points: row.points,
    tags: row.tags,
    reporters: row.reporters,
    resolvers: row.resolvers,
    created: row.created,
    updated: row.updated,
    completedAt: row.completedAt,
    filePath: row.filePath,
    children,
    workItemCount: row.workItemCount,
    doneWorkItemCount: row.doneWorkItemCount,
  }
}

function epicNode(
  epic: EpicSummary,
  workItems: EpicWorkItemsList | undefined,
  itemsByStory: Record<string, StoryItemList>
): OverallTreeNode {
  const children = (workItems?.rows ?? [])
    .map((row) => workItemNode(row, itemsByStory[`${epic.id}::${row.id}`]))
    .sort(compareOverallNodes)
  return {
    kind: "epic",
    id: epic.id,
    title: epic.title,
    status: epic.status,
    size: epic.size,
    points: epic.points,
    tags: epic.tags,
    reporters: epic.reporters,
    resolvers: epic.resolvers,
    created: epic.created,
    updated: epic.updated,
    completedAt: epic.completedAt,
    filePath: epic.filePath,
    children,
    workItemCount: epic.workItemCount,
    doneWorkItemCount: epic.doneWorkItemCount,
  }
}

export function buildOverallTree(
  epicList: ProjectEpicList,
  workItemsByEpic: Record<string, EpicWorkItemsList>,
  itemsByStory: Record<string, StoryItemList>
): OverallTreeNode[] {
  return epicList.epics
    .filter((epic) => !(isGeneralEpic(epic) && epic.workItemCount === 0))
    .map((epic) => epicNode(epic, workItemsByEpic[epic.id], itemsByStory))
    .sort(compareOverallNodes)
}

export type OverallTreeFilters = {
  query: string
  hideCompleted: boolean
  timeframe: TimeframeFilterState
}

/**
 * Retain a node when it matches itself or has a matching descendant. This
 * preserves hierarchy context for search, completed filtering, and timeframe.
 */
export function filterOverallTree(
  nodes: readonly OverallTreeNode[],
  filters: OverallTreeFilters
): OverallTreeNode[] {
  return nodes.flatMap((node) => {
    const children = filterOverallTree(node.children, filters)
    const selfMatches =
      matchesWorkItemSearch(filters.query, node) &&
      (!filters.hideCompleted || !isOverallNodeComplete(node.status)) &&
      passesTimeframeFilter(filters.timeframe, node.completedAt)
    if (!selfMatches && children.length === 0) return []
    return [{ ...node, children }]
  })
}

export function collectExpandableAncestorIds(
  nodes: readonly OverallTreeNode[]
): string[] {
  return nodes.flatMap((node) => [
    ...(node.children.length > 0 ? [node.id] : []),
    ...collectExpandableAncestorIds(node.children),
  ])
}

/**
 * Only a search reveals matches by expanding their ancestors. Toggle filters
 * such as hide-completed and timeframe keep whatever the user has open.
 */
export function searchRevealIds(
  nodes: readonly OverallTreeNode[],
  query: string
): string[] {
  return query.trim() ? collectExpandableAncestorIds(nodes) : []
}
