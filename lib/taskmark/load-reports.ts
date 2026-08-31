import fs from "node:fs"
import path from "node:path"

import {
  REPORTS_DIR_NAME,
  reportDateFromFileName,
  reportIsoDate,
  type BoardReport,
} from "@/lib/taskmark/report-types"

/**
 * Read the board `.reports/` directory for the UI. Never writes.
 * Reports are gitignored personal files written by `/tkmd-reportme`.
 * A missing directory, unreadable files, and whitespace-only files are absent.
 */
export function loadBoardReports(boardPath: string): BoardReport[] {
  const dir = path.join(boardPath, REPORTS_DIR_NAME)
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const reports: BoardReport[] = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const compact = reportDateFromFileName(entry.name)
    if (!compact) continue
    try {
      const raw = fs.readFileSync(path.join(dir, entry.name), "utf8")
      if (!raw.trim()) continue
      reports.push({
        id: compact,
        date: reportIsoDate(compact),
        markdown: raw,
      })
    } catch {
      // Unreadable report: treat as absent.
    }
  }

  return reports.sort((a, b) => b.id.localeCompare(a.id))
}
