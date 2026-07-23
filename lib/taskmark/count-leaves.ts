import fs from "node:fs"
import path from "node:path"

import {
  asString,
  extractFrontmatter,
} from "@/lib/taskmark/frontmatter"
import { findEpicFolder } from "@/lib/taskmark/parse-stories"

export type ChildProgress = {
  /** Stories + tasks/bugs (epic) or tasks/bugs (story). */
  total: number
  /** Children with status `done`. */
  done: number
}

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

function isDoneStatus(status: string): boolean {
  return status.trim().toLowerCase() === "done"
}

function readStatus(filePath: string): string {
  try {
    const raw = fs.readFileSync(filePath, "utf8")
    const fm = extractFrontmatter(raw)
    if (!fm) return ""
    return asString(fm.status)
  } catch {
    return ""
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

function progressLeavesInItemsDir(itemsDir: string): ChildProgress {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(itemsDir, { withFileTypes: true })
  } catch {
    return { total: 0, done: 0 }
  }

  let total = 0
  let done = 0
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const filePath = path.join(itemsDir, entry.name)
    if (!isLeafMarkdown(filePath)) continue
    total += 1
    if (isDoneStatus(readStatus(filePath))) done += 1
  }
  return { total, done }
}

function progressStoriesUnderEpic(epicDir: string): ChildProgress {
  const storiesDir = path.join(epicDir, "stories")
  let storyEntries: fs.Dirent[]
  try {
    storyEntries = fs.readdirSync(storiesDir, { withFileTypes: true })
  } catch {
    return { total: 0, done: 0 }
  }

  let total = 0
  let done = 0
  for (const entry of storyEntries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    const storyFile = path.join(storiesDir, entry.name, "story.md")
    if (!fs.existsSync(storyFile)) continue
    total += 1
    if (isDoneStatus(readStatus(storyFile))) done += 1
  }
  return { total, done }
}

function addProgress(a: ChildProgress, b: ChildProgress): ChildProgress {
  return { total: a.total + b.total, done: a.done + b.done }
}

/**
 * Work items under an epic: user stories + tasks/bugs in epic `items/`
 * and every story's `items/`.
 */
export function countWorkItemsUnderEpic(
  boardPath: string,
  epicId: string
): number {
  return progressUnderEpic(boardPath, epicId).total
}

/**
 * Progress under an epic: done vs total for stories + epic-direct leaves +
 * all story leaves.
 */
export function progressUnderEpic(
  boardPath: string,
  epicId: string
): ChildProgress {
  const epic = findEpicFolder(boardPath, epicId)
  if (!epic) return { total: 0, done: 0 }

  const epicDir = path.join(boardPath, "epics", epic.dirName)
  let progress = progressStoriesUnderEpic(epicDir)
  progress = addProgress(
    progress,
    progressLeavesInItemsDir(path.join(epicDir, "items"))
  )

  const storiesDir = path.join(epicDir, "stories")
  let storyEntries: fs.Dirent[]
  try {
    storyEntries = fs.readdirSync(storiesDir, { withFileTypes: true })
  } catch {
    return progress
  }

  for (const entry of storyEntries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    progress = addProgress(
      progress,
      progressLeavesInItemsDir(path.join(storiesDir, entry.name, "items"))
    )
  }
  return progress
}

/** Work items under a story: tasks + bugs in that story's `items/`. */
export function countWorkItemsUnderStory(
  boardPath: string,
  epicId: string,
  storyId: string
): number {
  return progressUnderStory(boardPath, epicId, storyId).total
}

/** Progress under a story: done vs total tasks/bugs. */
export function progressUnderStory(
  boardPath: string,
  epicId: string,
  storyId: string
): ChildProgress {
  const epic = findEpicFolder(boardPath, epicId)
  if (!epic) return { total: 0, done: 0 }

  const storiesDir = path.join(boardPath, "epics", epic.dirName, "stories")
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(storiesDir, { withFileTypes: true })
  } catch {
    return { total: 0, done: 0 }
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
      return progressLeavesInItemsDir(
        path.join(storiesDir, entry.name, "items")
      )
    } catch {
      continue
    }
  }
  return { total: 0, done: 0 }
}
