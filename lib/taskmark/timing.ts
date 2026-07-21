import {
  asNumberOrNull,
} from "@/lib/taskmark/frontmatter"

export type TimingFields = {
  estimateMinutes: number | null
  actualMinutes: number | null
  /** Session effort when present (E-004 dual model); optional. */
  effortMinutes: number | null
}

/**
 * Read estimate / actual / optional effort from board frontmatter.
 * Always prefers `estimate_minutes` and `actual_minutes` so lists keep
 * showing Est and Actual after layout and speed-model changes.
 */
export function readTimingFields(
  frontmatter: Record<string, unknown>
): TimingFields {
  return {
    estimateMinutes: asNumberOrNull(frontmatter.estimate_minutes),
    actualMinutes: asNumberOrNull(frontmatter.actual_minutes),
    effortMinutes: asNumberOrNull(frontmatter.effort_minutes),
  }
}

/** True when any row carries session effort (show Effort column). */
export function hasEffortData(
  rows: ReadonlyArray<{ effortMinutes: number | null }>
): boolean {
  return rows.some((row) => row.effortMinutes !== null)
}
