/**
 * Format estimate/actual minutes as a compact human duration.
 * Examples: `45m`, `2h`, `2h 30m`, `1d`, `1d 4h`, `3d 2h 15m`
 */
export function formatDurationMinutes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—"
  }

  const total = Math.max(0, Math.round(value))
  if (total === 0) return "0m"

  const days = Math.floor(total / (60 * 8)) // 1 day ≈ 8h workday (matches sizing seed)
  const afterDays = total % (60 * 8)
  const hours = Math.floor(afterDays / 60)
  const minutes = afterDays % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.join(" ")
}
