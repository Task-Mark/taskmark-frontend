import { format, isValid, parseISO } from "date-fns"

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const EMPTY = new Set(["", "null", "—", "-", "n/a", "N/A"])

/**
 * Parse Taskmark frontmatter / log date strings.
 * Date-only values (YYYY-MM-DD) are treated as local calendar days to avoid
 * UTC midnight shifting the displayed day.
 */
export function parseTaskmarkDate(
  value: string | null | undefined
): Date | null {
  const raw = value?.trim() ?? ""
  if (!raw || EMPTY.has(raw)) return null

  if (DATE_ONLY.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number)
    const local = new Date(y, m - 1, d)
    return isValid(local) ? local : null
  }

  try {
    const parsed = parseISO(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

function hasTimeComponent(raw: string): boolean {
  return raw.includes("T") || /\d{2}:\d{2}/.test(raw)
}

/**
 * Format any Taskmark date for display.
 * - Date-only → `Jul 23, 2026`
 * - Datetime → `Jul 23, 2026, 09:44`
 * - Missing/invalid → `—`
 */
export function formatTaskmarkDate(
  value: string | null | undefined
): string {
  const raw = value?.trim() ?? ""
  if (!raw || EMPTY.has(raw)) return "—"

  const date = parseTaskmarkDate(raw)
  if (!date) return raw

  if (hasTimeComponent(raw)) {
    return format(date, "MMM d, yyyy, HH:mm")
  }
  return format(date, "MMM d, yyyy")
}

/** Always include time when a valid datetime parses; otherwise date-only style. */
export function formatTaskmarkDateTime(
  value: string | null | undefined
): string {
  const raw = value?.trim() ?? ""
  if (!raw || EMPTY.has(raw)) return "—"

  const date = parseTaskmarkDate(raw)
  if (!date) return raw

  if (hasTimeComponent(raw)) {
    return format(date, "MMM d, yyyy, HH:mm")
  }
  return format(date, "MMM d, yyyy")
}

/** @deprecated Prefer {@link formatTaskmarkDate}. */
export function formatListDate(value: string | null | undefined): string {
  return formatTaskmarkDate(value)
}
