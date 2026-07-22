/**
 * Shared markdown section / table / checklist parsers for work item detail views.
 */

export function extractMarkdownBody(raw: string): string {
  const source = raw.replace(/^(---\r?\n[\s\S]*?\S)---(\r?\n)/, "$1\n---$2")
  const match = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(source)
  if (!match) return raw.trim()
  return source.slice(match[0].length).trim()
}

/** Split body into `## Heading` → content map (heading text without ##). */
export function extractSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const lines = body.split(/\r?\n/)
  let current: string | null = null
  const buf: string[] = []

  const flush = () => {
    if (current == null) return
    sections[current] = buf.join("\n").trim()
    buf.length = 0
  }

  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/.exec(line)
    if (heading) {
      flush()
      current = heading[1].trim()
      continue
    }
    if (current != null) buf.push(line)
  }
  flush()
  return sections
}

export function getSection(
  sections: Record<string, string>,
  ...names: string[]
): string {
  const lower = Object.fromEntries(
    Object.entries(sections).map(([k, v]) => [k.toLowerCase(), v])
  )
  for (const name of names) {
    const found = lower[name.toLowerCase()]
    if (found != null && found !== "") return found
  }
  return ""
}

export type ChecklistItem = {
  text: string
  checked: boolean
}

export function parseChecklist(markdown: string): ChecklistItem[] {
  const items: ChecklistItem[] = []
  for (const line of markdown.split(/\r?\n/)) {
    const m = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line)
    if (!m) continue
    items.push({
      checked: m[1].toLowerCase() === "x",
      text: m[2].trim(),
    })
  }
  return items
}

export type MarkdownTable = {
  headers: string[]
  rows: string[][]
}

/** Parse the first GitHub-flavored markdown table in a section. */
export function parseMarkdownTable(markdown: string): MarkdownTable | null {
  const lines = markdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].startsWith("|")) continue
    const headerCells = splitRow(lines[i])
    const sep = lines[i + 1]
    if (!sep || !/^\|?\s*:?-{3,}/.test(sep)) continue

    const rows: string[][] = []
    for (let j = i + 2; j < lines.length; j++) {
      if (!lines[j].startsWith("|")) break
      const cells = splitRow(lines[j])
      if (cells.every((c) => c === "" || c === "—" || c === "-")) continue
      rows.push(cells)
    }
    return { headers: headerCells, rows }
  }
  return null
}

function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith("|")) s = s.slice(1)
  if (s.endsWith("|")) s = s.slice(0, -1)
  return s.split("|").map((c) => c.trim())
}

export function tableRowsAsObjects(
  table: MarkdownTable | null
): Record<string, string>[] {
  if (!table) return []
  const keys = table.headers.map((h) => h.toLowerCase())
  return table.rows.map((row) => {
    const obj: Record<string, string> = {}
    keys.forEach((key, i) => {
      obj[key] = row[i] ?? ""
    })
    return obj
  })
}

export function cell(
  row: Record<string, string>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const found = row[key.toLowerCase()]
    if (found != null && found !== "") return found
  }
  // fuzzy: find header containing key
  for (const key of keys) {
    const hit = Object.entries(row).find(([k]) => k.includes(key.toLowerCase()))
    if (hit) return hit[1]
  }
  return ""
}
