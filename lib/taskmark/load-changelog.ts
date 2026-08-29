import fs from "node:fs"
import path from "node:path"

/**
 * Read board-root CHANGELOG.md for the UI. Never writes.
 * Missing, unreadable, or whitespace-only files are absent.
 */
export function loadBoardChangelogMarkdown(boardPath: string): string | null {
  const filePath = path.join(boardPath, "CHANGELOG.md")
  try {
    const raw = fs.readFileSync(filePath, "utf8")
    const trimmed = raw.trim()
    if (!trimmed) return null
    return raw
  } catch {
    return null
  }
}
