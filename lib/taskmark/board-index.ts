import fs from "node:fs"
import path from "node:path"

import { asString, extractFrontmatter } from "@/lib/taskmark/frontmatter"

export type IndexedLeaf = {
  filePath: string
  raw: string
  frontmatter: Record<string, unknown>
}

export type BoardIndex = {
  boardPath: string
  leaves: IndexedLeaf[]
  leavesByEpic: ReadonlyMap<string, IndexedLeaf[]>
  leavesByParent: ReadonlyMap<string, IndexedLeaf[]>
}

function addToMap(
  map: Map<string, IndexedLeaf[]>,
  key: string,
  leaf: IndexedLeaf
): void {
  if (!key) return
  const current = map.get(key)
  if (current) current.push(leaf)
  else map.set(key, [leaf])
}

function itemMarkdownFiles(dir: string): string[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "items") {
        let itemEntries: fs.Dirent[]
        try {
          itemEntries = fs.readdirSync(filePath, { withFileTypes: true })
        } catch {
          continue
        }
        for (const item of itemEntries) {
          if (
            item.isFile() &&
            !item.name.startsWith(".") &&
            item.name.endsWith(".md")
          ) {
            files.push(path.join(filePath, item.name))
          }
        }
      } else {
        files.push(...itemMarkdownFiles(filePath))
      }
    }
  }
  return files
}

/** Read every task/bug once and group leaves for reuse during one render. */
export function buildBoardIndex(boardPath: string): BoardIndex {
  const leaves: IndexedLeaf[] = []
  const leavesByEpic = new Map<string, IndexedLeaf[]>()
  const leavesByParent = new Map<string, IndexedLeaf[]>()

  for (const filePath of itemMarkdownFiles(path.join(boardPath, "epics"))) {
    try {
      const raw = fs.readFileSync(filePath, "utf8")
      const frontmatter = extractFrontmatter(raw)
      if (!frontmatter) continue
      const type = asString(frontmatter.type).toLowerCase()
      const id = asString(frontmatter.id)
      if ((type !== "task" && type !== "bug") || !id) continue

      const leaf = { filePath, raw, frontmatter }
      leaves.push(leaf)
      addToMap(leavesByEpic, asString(frontmatter.epic), leaf)
      addToMap(leavesByParent, asString(frontmatter.parent), leaf)
    } catch {
      // Existing parsers surface malformed files in their own result objects.
    }
  }

  leaves.sort((a, b) => a.filePath.localeCompare(b.filePath))
  return { boardPath, leaves, leavesByEpic, leavesByParent }
}
