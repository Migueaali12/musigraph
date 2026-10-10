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

export const MBID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isMbid(value: unknown): value is string {
  return typeof value === "string" && MBID_PATTERN.test(value)
}

export const DISCOGS_ID_PATTERN = /^\d{1,12}$/

export function isDiscogsId(value: unknown): value is string {
  return typeof value === "string" && DISCOGS_ID_PATTERN.test(value)
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

/**
 * Build a safe Virtuoso `bif:contains` expression from a user term.
 * Multi-word terms must be quoted as a phrase: `bif:contains "The Beatles"`
 * raises `XM029: syntax error at Beatles`, while `'The Beatles'` searches the
 * phrase. Apostrophes/hyphens are dropped because they break that quoting.
 */
export function buildTextIndexExpression(value: unknown): string {
  const tokens = sanitizeTextIndexTerm(value)
    .replace(/['-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)

  if (tokens.length === 0) return ""
  if (tokens.length === 1) return tokens[0]
  return `'${tokens.join(" ")}'`
}
