export const LIST_VIEW_MODES = ["overall", "workitems", "changelog"] as const

export type ListViewMode = (typeof LIST_VIEW_MODES)[number]

export const DEFAULT_LIST_VIEW_MODE: ListViewMode = "overall"

export const LIST_VIEW_LABELS: Record<ListViewMode, string> = {
  overall: "Overall",
  workitems: "Work items",
  changelog: "Changelog",
}

/** Legacy view query values that map to Work items. */
const LEGACY_WORKITEMS_VIEWS = new Set(["all", "stories", "tasks", "workitems"])

export function listViewModes(hasChangelog: boolean): ListViewMode[] {
  if (hasChangelog) return [...LIST_VIEW_MODES]
  return LIST_VIEW_MODES.filter((mode) => mode !== "changelog")
}

export function parseListViewMode(
  value: string | string[] | undefined,
  options?: { hasChangelog?: boolean }
): ListViewMode {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : ""
  if (raw === "overall") return "overall"
  if (LEGACY_WORKITEMS_VIEWS.has(raw)) return "workitems"
  if (raw === "changelog") {
    return options?.hasChangelog ? "changelog" : DEFAULT_LIST_VIEW_MODE
  }
  return DEFAULT_LIST_VIEW_MODE
}

export function boardHref(opts: {
  view?: ListViewMode
  epic?: string | null
  story?: string | null
  /** Open work item detail sheet (E-/S-/T-/B- id). */
  item?: string | null
}): string {
  const params = new URLSearchParams()
  const view = opts.view ?? DEFAULT_LIST_VIEW_MODE
  if (view !== DEFAULT_LIST_VIEW_MODE) {
    params.set("view", view)
  }
  if (view === "overall") {
    if (opts.epic) params.set("epic", opts.epic)
    if (opts.epic && opts.story) params.set("story", opts.story)
  }
  if (opts.item) params.set("item", opts.item)
  const qs = params.toString()
  return qs ? `/?${qs}` : "/"
}

const STATUS_RANK: Record<string, number> = {
  backlog: 0,
  in_progress: 1,
  blocked: 2,
  done: 3,
  shelved: 4,
  cancelled: 5,
}

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function statusSortRank(status: string): number {
  return STATUS_RANK[status.toLowerCase()] ?? 50
}

export function prioritySortRank(priority: string): number {
  return PRIORITY_RANK[priority.toLowerCase()] ?? 50
}

/**
 * Primary: status, with every incomplete state before terminal outcomes;
 * For open statuses: priority (highest first), then created (newest first);
 * For done/shelved/cancelled: solved date only (completedAt newest first; no priority);
 * then id.
 */
export function compareByStatusThenPriority(
  a: {
    status: string
    priority: string
    created?: string
    completedAt?: string
    id: string
  },
  b: {
    status: string
    priority: string
    created?: string
    completedAt?: string
    id: string
  }
): number {
  const byStatus = statusSortRank(a.status) - statusSortRank(b.status)
  if (byStatus !== 0) return byStatus

  // Solved cohort: newest completed first; ignore priority.
  if (usesCompletedDate(a.status)) {
    return compareByDateThenId(a, b, /*preferCompleted*/ true)
  }

  const byPriority =
    prioritySortRank(a.priority) - prioritySortRank(b.priority)
  if (byPriority !== 0) return byPriority

  return compareByDateThenId(a, b, /*preferCompleted*/ false)
}

function usesCompletedDate(status: string): boolean {
  const s = status.trim().toLowerCase()
  return s === "done" || s === "shelved" || s === "cancelled"
}

function compareByDateThenId(
  a: { created?: string; completedAt?: string; id: string; status: string },
  b: { created?: string; completedAt?: string; id: string; status: string },
  preferCompleted: boolean
): number {
  const dateA = preferCompleted
    ? completedOrCreated(a)
    : (a.created?.trim() ?? "")
  const dateB = preferCompleted
    ? completedOrCreated(b)
    : (b.created?.trim() ?? "")
  if (dateA && dateB) {
    const byDate = dateB.localeCompare(dateA)
    if (byDate !== 0) return byDate
  } else if (dateA !== dateB) {
    return dateA ? -1 : 1
  }
  return a.id.localeCompare(b.id)
}

function completedOrCreated(row: {
  created?: string
  completedAt?: string
}): string {
  const done = row.completedAt?.trim() ?? ""
  if (done) return done
  return row.created?.trim() ?? ""
}
