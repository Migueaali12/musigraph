// ── Input validation for SPARQL parameters ─────────────────────────────────
// Everything that gets interpolated into a query must pass through here.

export const QID_PATTERN = /^Q[1-9]\d{0,11}$/

export function isQid(value: unknown): value is string {
  return typeof value === "string" && QID_PATTERN.test(value)
}

export function isDbpediaResource(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^https?:\/\/(?:[a-z-]+\.)?dbpedia\.org\/resource\/[^\s<>"{}|\\^`]+$/.test(value)
  )
}

export function isAllowedDecade(value: unknown): value is string {
  return typeof value === "string" && /^(19|20)\d0$/.test(value)
}

export function isArtistType(value: unknown): value is "solo" | "band" | "composer" {
  return value === "solo" || value === "band" || value === "composer"
}

/** Trim, collapse whitespace and cap the length of a user search term. */
export function sanitizeSearchTerm(value: unknown): string {
  if (typeof value !== "string") return ""
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}

/** Escape a value so it can be embedded inside a SPARQL double-quoted literal. */
export function escapeSparqlLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

/**
 * Sanitize a term used inside Virtuoso's `bif:contains` full-text operator.
 * Only letters, numbers, spaces, apostrophes and hyphens survive.
 */
export function sanitizeTextIndexTerm(value: unknown): string {
  if (typeof value !== "string") return ""
  return value
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}
