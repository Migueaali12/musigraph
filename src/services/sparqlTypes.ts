// ── Shared SPARQL wire types ───────────────────────────────────────────────
// The binding shape is the app-wide data interchange format: every API action
// returns bindings (even for non-SPARQL sources, which are synthesized into
// the same shape by the enrichment orchestrator).

import type { SourceStatusMap } from "./sources"

export interface SparqlBinding {
  [key: string]: {
    value: string
    type: string
    "xml:lang"?: string
    datatype?: string
  }
}

export interface ArtistBio {
  text: string
  source: "wikipedia" | "dbpedia" | "wikidata"
  url?: string
}

export interface ArtistMember {
  name: string
  mbid?: string
  attributes?: string[]
}

/** External identifiers resolved from Wikidata (P434, P1953, P1902…). */
export interface ExternalIds {
  musicbrainz?: string
  discogs?: string
  spotify?: string
  lastfm?: string
  allmusic?: string
}

export interface ArtistEnrichment {
  bio?: ArtistBio
  members?: ArtistMember[]
  /** Extra genre names (MusicBrainz genres + tags) to merge with Wikidata. */
  genres?: string[]
}

export interface SparqlResponse {
  results: { bindings: SparqlBinding[] }
  /** Per-source provenance of the response. */
  sources?: SourceStatusMap
  /** Singleton enrichment payload (bio, members, genres). */
  enrichment?: ArtistEnrichment
}

export interface SearchFilters {
  genre?: string
  decade?: string
  country?: string
  artistType?: "solo" | "band" | "composer"
}

export function emptyResponse(): SparqlResponse {
  return { results: { bindings: [] } }
}
