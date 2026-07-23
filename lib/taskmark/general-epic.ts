/** Reserved default epic for unattached stories/tasks. */
export function isGeneralEpic(epic: {
  id: string
  title: string
  tags: string[]
  filePath: string
}): boolean {
  if (epic.title.trim().toLowerCase() === "general") return true
  if (epic.tags.some((t) => t.trim().toLowerCase() === "general")) return true
  const folder = epic.filePath.replace(/[/\\]epic\.md$/i, "")
  const base = folder.split(/[/\\]/).pop() ?? ""
  return base.toLowerCase().endsWith("-general") || base.toLowerCase() === "general"
}

/** Sort so General appears first, then by id. */
export function sortEpicsGeneralFirst<T extends { id: string; title: string; tags: string[]; filePath: string }>(
  epics: T[]
): T[] {
  return [...epics].sort((a, b) => {
    const ag = isGeneralEpic(a)
    const bg = isGeneralEpic(b)
    if (ag !== bg) return ag ? -1 : 1
    return a.id.localeCompare(b.id)
  })
}
