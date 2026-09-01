import { formatCompactNumber } from "@/lib/format-compact-number"
import type { ContributorIdentity } from "@/lib/taskmark/identity"

/** Shared metrics shape — safe for client components (no fs). */
export type ProjectStatusMetrics = {
  totalWorkItems: number
  completeWorkItems: number
  /** Story points completed in the current ISO week from done task/bug leaves. */
  currentWeekPointsDone: number
  /** Average story points completed per ISO week over the 90-day window; null if no done tasks/bugs. */
  currentSpeedPtsPerWeek: number | null
  /** Weeks included in the speed average (0 when no speed). */
  speedWeekCount: number
  /** Points of the best single ISO week inside the same 90-day window. */
  peakSpeedPtsPerWeek: number | null
  /** ISO week of that peak (`2026-W18`); null when there is no speed. */
  peakSpeedWeekLabel: string | null
  contributors: ContributorIdentity[]
}

/** Format average pts/week for display (whole numbers, compact when large). */
export function formatSpeedPtsPerWeek(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return formatCompactNumber(Math.round(value))
}
