/** Pure helpers for board list search and filters (client-side). */

import {
  DEFAULT_TIMEFRAME_FILTER,
  passesTimeframeFilter,
  timeframeResetKey,
  type TimeframeFilterState,
} from "@/lib/taskmark/timeframe-filters"

export type WorkItemSearchFields = {
  id: string
  title: string
}

export type ListSearchQuery = string

export type ParentFilterKind = "epic" | "story"

export type ParentFilterValue = {
  kind: ParentFilterKind
  id: string
  title: string
}

/** Stable key for parent filter selection (e.g. `epic:E-010`). */
export function parentFilterKey(parent: ParentFilterValue): string {
  return `${parent.kind}:${parent.id}`
}

export function parseParentFilterKey(
  key: string | null | undefined
): { kind: ParentFilterKind; id: string } | null {
  if (!key) return null
  const colon = key.indexOf(":")
  if (colon <= 0) return null
  const kind = key.slice(0, colon)
  const id = key.slice(colon + 1)
  if ((kind !== "epic" && kind !== "story") || !id) return null
  return { kind, id }
}

export type ListFilterState = {
  query: ListSearchQuery
  hideCompleted: boolean
  /** Selected parent keys (`epic:…` / `story:…`); empty = no parent filter. */
  parentKeys: string[]
  /** Empty = no tag filter; otherwise match any selected tag. */
  selectedTags: string[]
  timeframe: TimeframeFilterState
}

export const DEFAULT_LIST_FILTER_STATE: ListFilterState = {
  query: "",
  hideCompleted: false,
  parentKeys: [],
  selectedTags: [],
  timeframe: DEFAULT_TIMEFRAME_FILTER,
}

export type { TimeframeFilterState }
export {
  DEFAULT_TIMEFRAME_FILTER,
  isTimeframeActive,
  isWeekRangeSelection,
  recentWeekRange,
  timeframeResetKey,
} from "@/lib/taskmark/timeframe-filters"

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase()
}

/**
 * Empty / whitespace query matches everything.
 * Otherwise case-insensitive substring match on id or title.
 */
export function matchesWorkItemSearch(
  query: string,
  fields: WorkItemSearchFields
): boolean {
  const q = normalizeSearchQuery(query)
  if (!q) return true
  return (
    fields.id.toLowerCase().includes(q) ||
    fields.title.toLowerCase().includes(q)
  )
}

export function isCompletedStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase()
  return (
    normalized === "done" ||
    normalized === "shelved" ||
    normalized === "cancelled"
  )
}

/** True when every child is terminal (and there is at least one child). */
export function isChildProgressComplete(
  done?: number,
  total?: number
): boolean {
  if (total == null || done == null) return false
  return total > 0 && done >= total
}

/**
 * When hideCompleted is on, drop completed rows.
 *
 * Prefer child progress when totals are present: a parent with open children
 * stays visible even if frontmatter status is still `done` (e.g. epic-direct
 * backlog under a previously completed epic). Otherwise fall back to status.
 */
export function passesHideCompleted(
  hideCompleted: boolean,
  status: string,
  progress?: { done?: number; total?: number }
): boolean {
  if (!hideCompleted) return true
  const total = progress?.total
  const done = progress?.done
  if (total != null && total > 0 && done != null) {
    return !isChildProgressComplete(done, total)
  }
  return !isCompletedStatus(status)
}

/** Keep row if it includes any of the selected tags. Empty selection = pass. */
export function matchesAnySelectedTag(
  selectedTags: readonly string[],
  rowTags: readonly string[] | undefined
): boolean {
  if (selectedTags.length === 0) return true
  if (!rowTags || rowTags.length === 0) return false
  const set = new Set(rowTags.map((t) => t.toLowerCase()))
  return selectedTags.some((t) => set.has(t.toLowerCase()))
}

export type ParentFilterableRow = {
  id: string
  kind?: string
  epicId: string
}

/**
 * Empty selection → pass.
 * Otherwise match **any** selected parent:
 * - epic → rows under that epic
 * - story → that story row (Work items has no story-child tasks)
 */
export function matchesAnyParentFilter(
  parentKeys: readonly string[],
  row: ParentFilterableRow
): boolean {
  if (parentKeys.length === 0) return true
  return parentKeys.some((key) => {
    const parsed = parseParentFilterKey(key)
    if (!parsed) return false
    if (parsed.kind === "epic") return row.epicId === parsed.id
    return row.kind === "story" && row.id === parsed.id
  })
}

/** @deprecated Use matchesAnyParentFilter with a single-key array. */
export function matchesParentFilter(
  parentKey: string | null,
  row: ParentFilterableRow
): boolean {
  if (!parentKey) return true
  return matchesAnyParentFilter([parentKey], row)
}

export function collectUniqueTags(
  rows: readonly { tags?: readonly string[] }[]
): string[] {
  const set = new Set<string>()
  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      const t = tag.trim()
      if (t) set.add(t)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

export type ParentFilterOption = ParentFilterValue & {
  key: string
  /** Full label for the dropdown. */
  label: string
  /** Short label for chips (id). */
  chipLabel: string
}

/** Build epic + story options from Work items rows. */
export function buildParentFilterOptions(
  rows: readonly {
    id: string
    title: string
    kind: string
    epicId: string
    epicTitle: string
  }[]
): ParentFilterOption[] {
  const epics = new Map<string, ParentFilterOption>()
  const stories = new Map<string, ParentFilterOption>()

  for (const row of rows) {
    if (row.epicId && !epics.has(row.epicId)) {
      const value: ParentFilterValue = {
        kind: "epic",
        id: row.epicId,
        title: row.epicTitle,
      }
      epics.set(row.epicId, {
        ...value,
        key: parentFilterKey(value),
        label: `Epic ${row.epicId}: ${row.epicTitle}`,
        chipLabel: row.epicId,
      })
    }
    if (row.kind === "story" && !stories.has(row.id)) {
      const value: ParentFilterValue = {
        kind: "story",
        id: row.id,
        title: row.title,
      }
      stories.set(row.id, {
        ...value,
        key: parentFilterKey(value),
        label: `Story ${row.id}: ${row.title}`,
        chipLabel: row.id,
      })
    }
  }

  return [
    ...[...epics.values()].sort((a, b) => a.id.localeCompare(b.id)),
    ...[...stories.values()].sort((a, b) => a.id.localeCompare(b.id)),
  ]
}

export type FilterableListRow = WorkItemSearchFields & {
  status: string
  tags?: readonly string[]
  kind?: string
  epicId?: string
  /** Solved date (`completed_at`); required for timeframe filtering. */
  completedAt?: string
  /** When set with doneWorkItemCount, used for hide-completed on progress rows. */
  workItemCount?: number
  doneWorkItemCount?: number
}

export function filterListRows<T extends FilterableListRow>(
  rows: readonly T[],
  state: Pick<
    ListFilterState,
    "query" | "hideCompleted" | "selectedTags"
  > & {
    parentKeys?: readonly string[]
    /** @deprecated Prefer parentKeys. */
    parentKey?: string | null
    timeframe?: TimeframeFilterState
  }
): T[] {
  const parentKeys =
    state.parentKeys ??
    (state.parentKey ? [state.parentKey] : [])
  const timeframe = state.timeframe ?? DEFAULT_TIMEFRAME_FILTER
  return rows.filter((row) => {
    if (!matchesWorkItemSearch(state.query, row)) return false
    if (
      !passesHideCompleted(state.hideCompleted, row.status, {
        done: row.doneWorkItemCount,
        total: row.workItemCount,
      })
    ) {
      return false
    }
    if (!matchesAnySelectedTag(state.selectedTags, row.tags)) return false
    if (parentKeys.length > 0) {
      if (!row.epicId) return false
      if (
        !matchesAnyParentFilter(parentKeys, {
          id: row.id,
          kind: row.kind,
          epicId: row.epicId,
        })
      ) {
        return false
      }
    }
    if (!passesTimeframeFilter(timeframe, row.completedAt)) return false
    return true
  })
}

/** Compact reset key fragment for pagination when filters change. */
export function listFilterResetKey(
  base: string,
  state: Pick<
    ListFilterState,
    "query" | "hideCompleted" | "selectedTags"
  > & {
    parentKeys?: readonly string[]
    /** @deprecated Prefer parentKeys. */
    parentKey?: string | null
    timeframe?: TimeframeFilterState
  }
): string {
  const parentKeys =
    state.parentKeys ??
    (state.parentKey ? [state.parentKey] : [])
  const tags = [...state.selectedTags].sort().join(",")
  const parents = [...parentKeys].sort().join(",")
  const timeframe = state.timeframe ?? DEFAULT_TIMEFRAME_FILTER
  return [
    base,
    normalizeSearchQuery(state.query),
    state.hideCompleted ? "1" : "0",
    parents,
    tags,
    timeframeResetKey(timeframe),
  ].join("|")
}

/**
 * Shared shell classes matching ComboboxChips so search and multiselect
 * filters look the same.
 */
export const FILTER_CHIPS_FIELD_CLASS =
  "flex min-h-8 flex-wrap items-center gap-1 rounded border-2 bg-input bg-clip-padding px-2.5 py-1 text-sm shadow-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary"
