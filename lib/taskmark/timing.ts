import {
  asNumberOrNull,
} from "@/lib/taskmark/frontmatter"

export type TimingFields = {
  estimateMinutes: number | null
  /** Billable work-log minutes from start-work → complete-work sessions. */
  actualMinutes: number | null
}

/**
 * Read estimate and actual from board frontmatter.
 * Est = planned minutes (velocity × points or seed).
 * Actual = session time spent (falls back to legacy effort_minutes if needed).
 */
export function readTimingFields(
  frontmatter: Record<string, unknown>
): TimingFields {
  const actual =
    asNumberOrNull(frontmatter.actual_minutes) ??
    asNumberOrNull(frontmatter.effort_minutes)
  return {
    estimateMinutes: asNumberOrNull(frontmatter.estimate_minutes),
    actualMinutes: actual,
  }
}
