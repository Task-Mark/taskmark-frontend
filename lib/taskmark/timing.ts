import {
  asNumberOrNull,
} from "@/lib/taskmark/frontmatter"

export type TimingFields = {
  estimateMinutes: number | null
  /** Billable work-log minutes (floor of actual_ms / 60000). */
  actualMinutes: number | null
  /** Precise billable work-log duration in milliseconds. */
  actualMs: number | null
}

/**
 * Read estimate and actual from board frontmatter.
 * Est = optional/historical planned minutes (sizing no longer suggests time).
 * Actual = session time spent (prefers actual_ms; falls back to minutes / effort).
 */
export function readTimingFields(
  frontmatter: Record<string, unknown>
): TimingFields {
  const actualMinutes =
    asNumberOrNull(frontmatter.actual_minutes) ??
    asNumberOrNull(frontmatter.effort_minutes)
  const actualMs =
    asNumberOrNull(frontmatter.actual_ms) ??
    (actualMinutes != null ? actualMinutes * 60_000 : null)
  return {
    estimateMinutes: asNumberOrNull(frontmatter.estimate_minutes),
    actualMinutes,
    actualMs,
  }
}
