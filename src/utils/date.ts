// ── Date helpers tolerant of partial Wikidata/DBpedia dates ────────────────
// Wikidata stores year-precision dates as "1950-00-00T00:00:00Z" and DBpedia
// free-text dates as "26 February 1965"; `new Date()` chokes on both.

/** Extract a year from a date-ish string. Returns null when nothing usable is found. */
export function extractYear(value?: string | null): number | null {
  if (!value) return null
  const trimmed = value.trim()

  // ISO-ish dates, including Wikidata partial dates ("1950-00-00T00:00:00Z")
  const iso = /^(-?\d{4,6})-\d{2}-\d{2}/.exec(trimmed)
  if (iso) return Number(iso[1])

  // Plain years ("1965")
  const yearOnly = /^(-?\d{4,6})$/.exec(trimmed)
  if (yearOnly) return Number(yearOnly[1])

  // Free text ("26 February 1965", "February 1965")
  const anyYear = /(?:^|[^\d])(\d{4})(?:[^\d]|$)/.exec(trimmed)
  if (anyYear) return Number(anyYear[1])

  // Fallback: leading number
  const leading = /^(-?\d{1,6})/.exec(trimmed)
  return leading ? Number(leading[1]) : null
}

/** Year as display string, or null when unavailable. */
export function formatYear(value?: string | null): string | null {
  const year = extractYear(value)
  return year === null ? null : String(year)
}

/** Parse a date only when month and day are present; otherwise null. */
export function parseFullDate(value?: string | null): Date | null {
  if (!value) return null
  const match = /^(-?\d{4,6})-(\d{2})-(\d{2})T/.exec(value)
  if (!match) return null
  const [, , month, day] = match
  if (month === "00" || day === "00") return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
