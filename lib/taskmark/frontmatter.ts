import { parse as parseYaml } from "yaml"

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

/**
 * Some board edits historically glued the closing fence onto the last
 * frontmatter line (`completed_at: …Z---`). Normalize before matching.
 */
export function normalizeFrontmatterSource(raw: string): string {
  if (!raw.startsWith("---")) return raw
  return raw.replace(/^(---\r?\n[\s\S]*?\S)---(\r?\n)/, "$1\n---$2")
}

export function extractFrontmatter(raw: string): Record<string, unknown> | null {
  const source = normalizeFrontmatterSource(raw)
  const match = FRONTMATTER_RE.exec(source)
  if (!match) return null
  const parsed = parseYaml(match[1])
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null
  }
  return parsed as Record<string, unknown>
}

export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return fallback
}

export function asNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => asString(v)).filter(Boolean)
}
