/** English compact magnitudes: 1K, 1.5K, 1M, 1B. */
export const COMPACT_NUMBER_LOCALES = "en"

export const COMPACT_NUMBER_FORMAT_OPTIONS = {
  notation: "compact" as const,
  compactDisplay: "short" as const,
  maximumFractionDigits: 1,
}

export const COMPACT_INTEGER_FORMAT_OPTIONS = {
  ...COMPACT_NUMBER_FORMAT_OPTIONS,
  maximumFractionDigits: 0,
}

const compactNumberFormatter = new Intl.NumberFormat(
  COMPACT_NUMBER_LOCALES,
  COMPACT_NUMBER_FORMAT_OPTIONS
)

const exactNumberFormatter = new Intl.NumberFormat(COMPACT_NUMBER_LOCALES, {
  maximumFractionDigits: 1,
})

/** Short magnitude label for large counts and points (1K, 1M, 1B). */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return compactNumberFormatter.format(value)
}

/** Unabbreviated value for titles and accessible names. */
export function formatExactNumber(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return exactNumberFormatter.format(value)
}
