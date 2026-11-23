/**
 * Server-side checks for board images referenced from markdown. Used by the
 * live `/api/board-asset` route and by the static build copy step, so both
 * expose exactly the same files.
 */
import fs from "node:fs"
import path from "node:path"

import {
  BOARD_ASSET_STATIC_DIR,
  collectMarkdownImageSrcs,
  resolveBoardAssetPath,
} from "@taskmark/components/board-model"

import { REPORTS_DIR_NAME } from "@/lib/taskmark/report-types"
import { boardContentRelDirs } from "@/lib/taskmark/board-layout"

/** Largest image either mode will serve or copy. */
export const MAX_BOARD_ASSET_BYTES = 20 * 1024 * 1024

const BLOCKED_SEGMENTS = new Set([
  "node_modules",
  "out",
  ".next",
  ".taskmark-ui-build",
  ".taskmark-ui-dev",
  ".taskmark-build",
])

export function realpathOrNull(target: string): string | null {
  try {
    return fs.realpathSync(target)
  } catch {
    return null
  }
}

/**
 * Board-relative path of `file` when it sits inside `board` on a segment the
 * board UI may expose: no dot folders other than a top-level `.reports`, no
 * dependency or build output. Both paths must already be realpaths.
 */
export function allowedBoardRelative(board: string, file: string): string | null {
  const rel = path.relative(board, file)
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null
  const segments = rel.split(path.sep)
  for (const [index, segment] of segments.entries()) {
    if (BLOCKED_SEGMENTS.has(segment)) return null
    const isReportsDir = index === 0 && segment === REPORTS_DIR_NAME
    if (segment.startsWith(".") && !isReportsDir) return null
  }
  return rel
}

/** Size-checked regular file, or null. */
export function servableAssetStat(file: string): fs.Stats | null {
  try {
    const stat = fs.statSync(file)
    return stat.isFile() && stat.size <= MAX_BOARD_ASSET_BYTES ? stat : null
  } catch {
    return null
  }
}

/** Board markdown the UI renders: epics tree, CHANGELOG.md, `.reports`. */
function listBoardMarkdown(boardPath: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full)
    }
  }
  for (const dir of boardContentRelDirs(boardPath)) {
    walk(path.join(boardPath, dir))
  }
  const changelog = path.join(boardPath, "CHANGELOG.md")
  if (fs.existsSync(changelog)) out.push(changelog)
  const reportsDir = path.join(boardPath, REPORTS_DIR_NAME)
  try {
    for (const name of fs.readdirSync(reportsDir)) {
      if (/^report-\d{8}\.md$/.test(name)) out.push(path.join(reportsDir, name))
    }
  } catch {
    // no reports
  }
  return out
}

/**
 * Copy every image that board markdown references by relative path into
 * `<publicDir>/board-assets/<board-relative path>`, matching the URLs the
 * static UI builds. Missing or disallowed targets are skipped with a warning.
 */
export function copyReferencedBoardAssets(
  boardPath: string,
  publicDir: string
): { copied: number; skipped: string[] } {
  const board = realpathOrNull(boardPath)
  const destRoot = path.join(publicDir, BOARD_ASSET_STATIC_DIR)
  fs.rmSync(destRoot, { recursive: true, force: true })
  if (!board) return { copied: 0, skipped: [] }

  const wanted = new Set<string>()
  const skipped: string[] = []
  for (const mdFile of listBoardMarkdown(board)) {
    let markdown: string
    try {
      markdown = fs.readFileSync(mdFile, "utf8")
    } catch {
      continue
    }
    const sourceRel = path.relative(board, mdFile).split(path.sep).join("/")
    for (const src of collectMarkdownImageSrcs(markdown)) {
      const assetRel = resolveBoardAssetPath(sourceRel, src)
      if (!assetRel) continue
      const file = realpathOrNull(path.join(board, ...assetRel.split("/")))
      if (!file || !allowedBoardRelative(board, file) || !servableAssetStat(file)) {
        skipped.push(`${sourceRel}: ${src}`)
        continue
      }
      // Key by the URL path the UI requests, not the symlink-resolved one.
      wanted.add(assetRel)
    }
  }

  for (const assetRel of wanted) {
    const dest = path.join(destRoot, ...assetRel.split("/"))
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(path.join(board, ...assetRel.split("/")), dest)
  }
  return { copied: wanted.size, skipped }
}
