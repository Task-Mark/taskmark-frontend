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
  /** Highest Current Speed (same 90-day rule) across week ends from first completion through now. */
  peakSpeedPtsPerWeek: number | null
  /** ISO week of the peak (`2026-W18`); null when there is no speed. */
  peakSpeedWeekLabel: string | null
  contributors: ContributorIdentity[]
}

/** Format average pts/week for display (whole numbers, compact when large). */
export function formatSpeedPtsPerWeek(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return formatCompactNumber(Math.round(value))
}
