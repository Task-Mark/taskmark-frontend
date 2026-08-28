import {
  cell,
  extractMarkdownBody,
  extractSections,
  getSection,
  parseMarkdownTable,
  tableRowsAsObjects,
} from "@/lib/taskmark/parse-sections"

export type TimingFields = {
  /** Billable work-log minutes (floor of actual_ms / 60000). */
  actualMinutes: number | null
  /** Precise billable work-log duration in milliseconds. */
  actualMs: number | null
}

/**
 * Actual is the sum of closed Work log intervals stored on the leaf.
 * Frontmatter timing fields are intentionally ignored.
 */
export function readActualTimingFromWorkLog(raw: string): TimingFields {
  const sections = extractSections(extractMarkdownBody(raw))
  const rows = tableRowsAsObjects(
    parseMarkdownTable(getSection(sections, "Work log"))
  )
  let actualMs = 0
  let hasClosedInterval = false

  for (const row of rows) {
    const started = Date.parse(cell(row, "started (utc)", "started"))
    const ended = Date.parse(cell(row, "ended (utc)", "ended"))
    if (!Number.isFinite(started) || !Number.isFinite(ended) || ended < started) {
      continue
    }
    hasClosedInterval = true
    actualMs += ended - started
  }

  return {
    actualMinutes: hasClosedInterval ? Math.floor(actualMs / 60_000) : null,
    actualMs: hasClosedInterval ? actualMs : null,
  }
}
