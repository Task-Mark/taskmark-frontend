/**
 * Format estimate minutes as a compact human duration.
 * Examples: `45m`, `2h`, `2h 30m`, `1d`, `1d 4h`
 */
export function formatDurationMinutes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—"
  }

  const total = Math.max(0, Math.round(value))
  if (total === 0) return "0m"

  return formatDurationMs(total * 60_000)
}

/**
 * Format billable Actual from milliseconds.
 * Uses ms / fractional seconds only when useful; otherwise compact m/h/d.
 *
 * Examples: `0ms`, `250ms`, `1.5s`, `45s`, `2m 3s`, `2h 30m`, `1d 4h`
 */
export function formatDurationMs(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—"
  }

  const ms = Math.max(0, Math.round(value))
  if (ms === 0) return "0ms"

  if (ms < 1000) {
    return `${ms}ms`
  }

  if (ms < 60_000) {
    const seconds = ms / 1000
    if (Number.isInteger(seconds) || ms % 1000 === 0) {
      return `${Math.round(seconds)}s`
    }
    const rounded = Math.round(seconds * 100) / 100
    return `${rounded}s`
  }

  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / (60 * 60 * 8)) // 1 day ≈ 8h workday
  let rem = totalSeconds % (60 * 60 * 8)
  const hours = Math.floor(rem / 3600)
  rem = rem % 3600
  const minutes = Math.floor(rem / 60)
  const seconds = rem % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  // Show leftover seconds when under an hour and there is a seconds remainder
  if (seconds > 0 && days === 0 && hours === 0) {
    parts.push(`${seconds}s`)
  }

  return parts.length > 0 ? parts.join(" ") : "0ms"
}

/** Prefer precise actual_ms; fall back to actual_minutes × 60_000. */
export function formatActualDuration(
  actualMs: number | null | undefined,
  actualMinutes: number | null | undefined
): string {
  if (actualMs != null && Number.isFinite(actualMs)) {
    return formatDurationMs(actualMs)
  }
  return formatDurationMinutes(actualMinutes)
}
