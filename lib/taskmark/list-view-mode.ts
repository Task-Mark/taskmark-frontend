export const LIST_VIEW_MODES = ["overall", "workitems"] as const

export type ListViewMode = (typeof LIST_VIEW_MODES)[number]

export const DEFAULT_LIST_VIEW_MODE: ListViewMode = "overall"

export const LIST_VIEW_LABELS: Record<ListViewMode, string> = {
  overall: "Overall",
  workitems: "Work items",
}

/** Legacy view query values that map to Work items. */
const LEGACY_WORKITEMS_VIEWS = new Set(["all", "stories", "tasks", "workitems"])

export function parseListViewMode(
  value: string | string[] | undefined
): ListViewMode {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : ""
  if (raw === "overall") return "overall"
  if (LEGACY_WORKITEMS_VIEWS.has(raw)) return "workitems"
  return DEFAULT_LIST_VIEW_MODE
}

export function boardHref(opts: {
  view?: ListViewMode
  epic?: string | null
  story?: string | null
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
  const qs = params.toString()
  return qs ? `/board?${qs}` : "/board"
}

const STATUS_RANK: Record<string, number> = {
  backlog: 0,
  in_progress: 1,
  done: 2,
  blocked: 3,
  cancelled: 4,
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
 * Primary: status (backlog → in_progress → done);
 * secondary: priority (highest first);
 * tertiary: created date (newest first);
 * then id.
 */
export function compareByStatusThenPriority(
  a: { status: string; priority: string; created?: string; id: string },
  b: { status: string; priority: string; created?: string; id: string }
): number {
  const byStatus = statusSortRank(a.status) - statusSortRank(b.status)
  if (byStatus !== 0) return byStatus
  const byPriority =
    prioritySortRank(a.priority) - prioritySortRank(b.priority)
  if (byPriority !== 0) return byPriority
  const createdA = a.created?.trim() ?? ""
  const createdB = b.created?.trim() ?? ""
  if (createdA && createdB) {
    const byCreated = createdB.localeCompare(createdA)
    if (byCreated !== 0) return byCreated
  } else if (createdA !== createdB) {
    // Missing created sorts after dated items
    return createdA ? -1 : 1
  }
  return a.id.localeCompare(b.id)
}
