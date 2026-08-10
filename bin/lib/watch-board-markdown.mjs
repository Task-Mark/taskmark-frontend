import fs from "node:fs"
import path from "node:path"

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "out",
  ".next",
  "dist",
  ".taskmark-ui-build",
])

function shouldIgnoreDir(name) {
  return IGNORE_DIRS.has(name) || name.startsWith(".")
}

function latestMarkdownMtime(boardRoot) {
  let latest = 0
  const walk = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!shouldIgnoreDir(entry.name)) walk(full)
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          latest = Math.max(latest, fs.statSync(full).mtimeMs)
        } catch {
          // ignore races
        }
      }
    }
  }
  walk(boardRoot)
  return latest
}

/**
 * Poll a board directory for `.md` mtime changes.
 * Uses polling (not recursive fs.watch) to avoid EMFILE on large boards.
 * Returns a stop function.
 */
export function watchBoardMarkdown(boardRoot, onChange) {
  let stopped = false
  let lastStamp = latestMarkdownMtime(boardRoot)

  const interval = setInterval(() => {
    if (stopped) return
    const next = latestMarkdownMtime(boardRoot)
    if (next > lastStamp) {
      lastStamp = next
      onChange()
    }
  }, 750)

  return () => {
    stopped = true
    clearInterval(interval)
  }
}
