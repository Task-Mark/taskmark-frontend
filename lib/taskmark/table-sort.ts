/** Pure table-sort types and comparators for board lists. */

import {
  prioritySortRank,
  statusSortRank,
} from "@/lib/taskmark/list-view-mode"
import type { ContributorIdentity } from "@/lib/taskmark/identity"

export const TABLE_SORT_KEYS = [
  "id",
  "title",
  "size",
  "epic",
  "points",
  "status",
  "priority",
  "type",
  "people",
] as const

export type TableSortKey = (typeof TABLE_SORT_KEYS)[number]

export type TableSortDirection = "asc" | "desc"

export type TableSortState = {
  key: TableSortKey
  direction: TableSortDirection
}

/** Static t-shirt rank: XS < S < M < L < XL < XXL. */
const SIZE_RANK: Record<string, number> = {
  XS: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
  XXL: 6,
}

const ID_PREFIX_RANK: Record<string, number> = {
  E: 1,
  S: 2,
  T: 3,
  B: 4,
}

export function isTableSortKey(value: string): value is TableSortKey {
  return (TABLE_SORT_KEYS as readonly string[]).includes(value)
}

export function sizeSortRank(size: string | null | undefined): number | null {
  if (!size?.trim()) return null
  const rank = SIZE_RANK[size.trim().toUpperCase()]
  return rank ?? null
}

/**
 * Natural Taskmark id compare for legacy numeric IDs. Collision-resistant IDs
 * use the general natural fallback and are never constrained to an NNN shape.
 */
export function compareTaskmarkIds(a: string, b: string): number {
  const pa = parseTaskmarkId(a)
  const pb = parseTaskmarkId(b)
  if (pa && pb) {
    if (pa.prefixRank !== pb.prefixRank) return pa.prefixRank - pb.prefixRank
    if (pa.num !== pb.num) return pa.num - pb.num
    return pa.raw.localeCompare(pb.raw)
  }
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
}

function parseTaskmarkId(id: string): {
  prefixRank: number
  num: number
  raw: string
} | null {
  const m = id.trim().match(/^([A-Za-z]+)-(\d+)$/)
  if (!m) return null
  const prefix = m[1]!.toUpperCase()
  const prefixRank = ID_PREFIX_RANK[prefix] ?? 100 + prefix.charCodeAt(0)
  return { prefixRank, num: Number(m[2]), raw: id.trim() }
}

/** Null/empty values always sort after defined values (both directions). */
export function compareNullable(
  a: number | null,
  b: number | null,
  direction: TableSortDirection
): number | null {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  const cmp = a - b
  return direction === "asc" ? cmp : -cmp
}

export function compareStrings(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: TableSortDirection
): number {
  const left = a?.trim() ?? ""
  const right = b?.trim() ?? ""
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  const cmp = left.localeCompare(right, undefined, {
    sensitivity: "base",
    numeric: true,
  })
  return direction === "asc" ? cmp : -cmp
}

export function compareSizes(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: TableSortDirection
): number {
  const ra = sizeSortRank(a)
  const rb = sizeSortRank(b)
  const ranked = compareNullable(ra, rb, direction)
  if (ranked !== null && ranked !== 0) return ranked
  if (ranked === 0 && ra !== null) return 0
  // Both unknown: fall back to string
  return compareStrings(a, b, direction)
}

export function compareIds(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: TableSortDirection
): number {
  const left = a?.trim() ?? ""
  const right = b?.trim() ?? ""
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  const cmp = compareTaskmarkIds(left, right)
  return direction === "asc" ? cmp : -cmp
}

/** Epic: title primary, id tie-break; missing epic last. */
export function compareEpics(
  a: { epicId?: string | null; epicTitle?: string | null },
  b: { epicId?: string | null; epicTitle?: string | null },
  direction: TableSortDirection
): number {
  const aKey = (a.epicTitle?.trim() || a.epicId?.trim() || "").toLowerCase()
  const bKey = (b.epicTitle?.trim() || b.epicId?.trim() || "").toLowerCase()
  if (!aKey && !bKey) {
    return compareIds(a.epicId, b.epicId, direction)
  }
  if (!aKey) return 1
  if (!bKey) return -1
  const titleCmp = aKey.localeCompare(bKey, undefined, { sensitivity: "base" })
  if (titleCmp !== 0) {
    return direction === "asc" ? titleCmp : -titleCmp
  }
  return compareIds(a.epicId, b.epicId, direction)
}

export function comparePoints(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: TableSortDirection
): number {
  const left = a == null || Number.isNaN(a) ? null : a
  const right = b == null || Number.isNaN(b) ? null : b
  const ranked = compareNullable(left, right, direction)
  return ranked ?? 0
}

/** Workflow order: backlog < in_progress < done < blocked < cancelled. */
export function compareStatuses(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: TableSortDirection
): number {
  const left = a?.trim() ?? ""
  const right = b?.trim() ?? ""
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  const cmp = statusSortRank(left) - statusSortRank(right)
  return direction === "asc" ? cmp : -cmp
}

/** Priority order: critical < high < medium < low (asc = most urgent first). */
export function comparePriorities(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: TableSortDirection
): number {
  const left = a?.trim() ?? ""
  const right = b?.trim() ?? ""
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  const cmp = prioritySortRank(left) - prioritySortRank(right)
  return direction === "asc" ? cmp : -cmp
}

const TYPE_RANK: Record<string, number> = {
  epic: 0,
  story: 1,
  task: 2,
  bug: 3,
}

export function typeSortRank(type: string | null | undefined): number | null {
  if (!type?.trim()) return null
  const rank = TYPE_RANK[type.trim().toLowerCase()]
  return rank ?? null
}

/** epic < story < task < bug; unknown last. */
export function compareTypes(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: TableSortDirection
): number {
  const ra = typeSortRank(a)
  const rb = typeSortRank(b)
  const ranked = compareNullable(ra, rb, direction)
  if (ranked !== null && ranked !== 0) return ranked
  if (ranked === 0 && ra !== null) return 0
  return compareStrings(a, b, direction)
}

/** Stable label from unique contributors (name, else email), sorted. */
export function peopleSortLabel(
  reporters?: readonly ContributorIdentity[] | null,
  resolvers?: readonly ContributorIdentity[] | null
): string {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const person of [...(reporters ?? []), ...(resolvers ?? [])]) {
    const id = (person.email || person.name || "").trim().toLowerCase()
    if (!id || seen.has(id)) continue
    seen.add(id)
    labels.push((person.name || person.email || "").trim().toLowerCase())
  }
  labels.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  return labels.join(", ")
}

export function comparePeople(
  a: {
    reporters?: readonly ContributorIdentity[] | null
    resolvers?: readonly ContributorIdentity[] | null
  },
  b: {
    reporters?: readonly ContributorIdentity[] | null
    resolvers?: readonly ContributorIdentity[] | null
  },
  direction: TableSortDirection
): number {
  return compareStrings(
    peopleSortLabel(a.reporters, a.resolvers),
    peopleSortLabel(b.reporters, b.resolvers),
    direction
  )
}

export type SortableRowFields = {
  id?: string | null
  title?: string | null
  size?: string | null
  epicId?: string | null
  epicTitle?: string | null
  points?: number | null
  status?: string | null
  priority?: string | null
  /** Work-item kind or item type (`story` / `task` / `bug` / `epic`). */
  kind?: string | null
  type?: string | null
  reporters?: readonly ContributorIdentity[] | null
  resolvers?: readonly ContributorIdentity[] | null
}

export function compareSortableRows(
  a: SortableRowFields,
  b: SortableRowFields,
  state: TableSortState
): number {
  switch (state.key) {
    case "id":
      return compareIds(a.id, b.id, state.direction)
    case "title":
      return compareStrings(a.title, b.title, state.direction)
    case "size":
      return compareSizes(a.size, b.size, state.direction)
    case "epic":
      return compareEpics(a, b, state.direction)
    case "points":
      return comparePoints(a.points, b.points, state.direction)
    case "status":
      return compareStatuses(a.status, b.status, state.direction)
    case "priority":
      return comparePriorities(a.priority, b.priority, state.direction)
    case "type":
      return compareTypes(a.kind ?? a.type, b.kind ?? b.type, state.direction)
    case "people":
      return comparePeople(a, b, state.direction)
    default:
      return 0
  }
}

/** Stable sort: tie-break by original index. */
export function sortRowsByTableSort<T extends SortableRowFields>(
  rows: readonly T[],
  state: TableSortState | null
): T[] {
  if (!state) return [...rows]
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const cmp = compareSortableRows(a.row, b.row, state)
      return cmp !== 0 ? cmp : a.index - b.index
    })
    .map(({ row }) => row)
}

/**
 * Cycle sort for a column: none → asc → desc → none (default order).
 * Switching to a different column always starts at asc.
 */
export function toggleTableSort(
  current: TableSortState | null,
  key: TableSortKey
): TableSortState | null {
  if (current?.key !== key) {
    return { key, direction: "asc" }
  }
  if (current.direction === "asc") {
    return { key, direction: "desc" }
  }
  return null
}

export function tableSortResetKey(state: TableSortState | null): string {
  if (!state) return ""
  return `${state.key}:${state.direction}`
}
