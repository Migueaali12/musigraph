// ── Data sources and provenance ────────────────────────────────────────────
// Shared between client components (source badges) and server adapters.
// Keep this module free of server-only imports.

export type SourceId =
  | "wikidata"
  | "qlever"
  | "dbpedia"
  | "wikipedia"
  | "musicbrainz"
  | "discogs"

/** Outcome of an enrichment source for a single request. */
export type SourceStatus = "ok" | "empty" | "error" | "timeout" | "skipped"

export type SourceStatusMap = Partial<Record<SourceId, SourceStatus>>

export const SOURCE_LABELS: Record<SourceId, string> = {
  wikidata: "Wikidata",
  qlever: "QLever",
  dbpedia: "DBpedia",
  wikipedia: "Wikipedia",
  musicbrainz: "MusicBrainz",
  discogs: "Discogs",
}

export const SOURCE_HOMEPAGES: Record<SourceId, string> = {
  wikidata: "https://www.wikidata.org",
  qlever: "https://qlever.dev",
  dbpedia: "https://dbpedia.org",
  wikipedia: "https://www.wikipedia.org",
  musicbrainz: "https://musicbrainz.org",
  discogs: "https://www.discogs.com",
}

/** Anchor to the methodology page section for a source. */
export function sourceAnchorHref(locale: string, source: SourceId): string {
  return `/${locale}/data#${source}`
}
