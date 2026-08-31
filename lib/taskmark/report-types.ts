/** Board report shapes shared by the server loader, the snapshot, and the UI. */

/** Gitignored board directory holding `/tkmd-reportme` output. */
export const REPORTS_DIR_NAME = ".reports"

const REPORT_FILE_PATTERN = /^report-(\d{8})\.md$/

export type BoardReport = {
  /** Compact date from the filename, e.g. `20260831`. */
  id: string
  /** Date-only ISO form for display, e.g. `2026-08-31`. */
  date: string
  markdown: string
}

/** `report-20260831.md` → `20260831`; anything else → null. */
export function reportDateFromFileName(fileName: string): string | null {
  const match = REPORT_FILE_PATTERN.exec(fileName)
  if (!match) return null
  const compact = match[1]!
  return isRealCompactDate(compact) ? compact : null
}

/** `20260831` → `2026-08-31`. */
export function reportIsoDate(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
}

function isRealCompactDate(compact: string): boolean {
  const year = Number(compact.slice(0, 4))
  const month = Number(compact.slice(4, 6))
  const day = Number(compact.slice(6, 8))
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}
