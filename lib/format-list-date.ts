/**
 * Format a Taskmark frontmatter date for list display.
 * Accepts YYYY-MM-DD or ISO timestamps; returns YYYY-MM-DD or "—".
 */
export function formatListDate(value: string | null | undefined): string {
  const raw = value?.trim() ?? ""
  if (!raw || raw === "null" || raw === "—") return "—"
  const datePart = raw.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart
  return raw
}
