import fs from "node:fs"
import path from "node:path"

import {
  asString,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import { findEpicFolder } from "@/lib/taskmark/parse-stories"

function isLeafMarkdown(filePath: string): boolean {
  const base = path.basename(filePath)
  if (!base.endsWith(".md") || base.startsWith(".")) return false
  // Fast path from filename conventions
  if (/^[TB]-\d+/i.test(base)) return true

  try {
    const raw = fs.readFileSync(filePath, "utf8")
    const fm = extractFrontmatter(raw)
    if (!fm) return false
    const type = asString(fm.type).toLowerCase()
    if (type === "task" || type === "bug") return true
    const id = asString(fm.id)
    return id.startsWith("T-") || id.startsWith("B-")
  } catch {
    return false
  }
}

/** Count task/bug markdown files directly under an `items/` directory. */
export function countLeavesInItemsDir(itemsDir: string): number {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(itemsDir, { withFileTypes: true })
  } catch {
    return 0
  }

  let count = 0
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const filePath = path.join(itemsDir, entry.name)
    if (isLeafMarkdown(filePath)) count += 1
  }
  return count
}

function countStoriesUnderEpic(epicDir: string): number {
  const storiesDir = path.join(epicDir, "stories")
  let storyEntries: fs.Dirent[]
  try {
    storyEntries = fs.readdirSync(storiesDir, { withFileTypes: true })
  } catch {
    return 0
  }

  let count = 0
  for (const entry of storyEntries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    const storyFile = path.join(storiesDir, entry.name, "story.md")
    if (fs.existsSync(storyFile)) count += 1
  }
  return count
}

/**
 * Work items under an epic: user stories + tasks/bugs in epic `items/`
 * and every story's `items/`.
 */
export function countWorkItemsUnderEpic(
  boardPath: string,
  epicId: string
): number {
  const epic = findEpicFolder(boardPath, epicId)
  if (!epic) return 0

  const epicDir = path.join(boardPath, "epics", epic.dirName)
  let total = countStoriesUnderEpic(epicDir)
  total += countLeavesInItemsDir(path.join(epicDir, "items"))

  const storiesDir = path.join(epicDir, "stories")
  let storyEntries: fs.Dirent[]
  try {
    storyEntries = fs.readdirSync(storiesDir, { withFileTypes: true })
  } catch {
    return total
  }

  for (const entry of storyEntries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    total += countLeavesInItemsDir(
      path.join(storiesDir, entry.name, "items")
    )
  }
  return total
}

/** Work items under a story: tasks + bugs in that story's `items/`. */
export function countWorkItemsUnderStory(
  boardPath: string,
  epicId: string,
  storyId: string
): number {
  const epic = findEpicFolder(boardPath, epicId)
  if (!epic) return 0

  const storiesDir = path.join(boardPath, "epics", epic.dirName, "stories")
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(storiesDir, { withFileTypes: true })
  } catch {
    return 0
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    const storyFile = path.join(storiesDir, entry.name, "story.md")
    if (!fs.existsSync(storyFile)) continue
    try {
      const raw = fs.readFileSync(storyFile, "utf8")
      const fm = extractFrontmatter(raw)
      if (!fm) continue
      if (asString(fm.id) !== storyId) continue
      return countLeavesInItemsDir(path.join(storiesDir, entry.name, "items"))
    } catch {
      continue
    }
  }
  return 0
}
