// ── Data provider registry ─────────────────────────────────────────────────
// Shared between the client (selector) and the API route.
// Keep this module free of server-only imports.

export type ProviderId = "auto" | "wikidata" | "qlever" | "dbpedia"
export type Engine = "blazegraph" | "qlever" | "virtuoso"
export type Lang = "en" | "es"

export interface ProviderInfo {
  id: ProviderId
  label: string
  url: string
  engine: Engine
  /** Blazegraph wikibase:label service (WDQS v1 only) */
  labelService: boolean
  /** Requires full xsd:dateTime literals and strict SPARQL 1.1 (QLever) */
  strictDates: boolean
  /** Virtuoso bif:contains full-text index */
  textIndex: boolean
  /** Public attribution link shown in the footer */
  homepage: string
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  auto: {
    id: "auto",
    label: "Auto",
    url: "https://query.wikidata.org/sparql",
    engine: "blazegraph",
    labelService: true,
    strictDates: false,
    textIndex: false,
    homepage: "https://wikidata.org",
  },
  wikidata: {
    id: "wikidata",
    label: "Wikidata",
    url: "https://query.wikidata.org/sparql",
    engine: "blazegraph",
    labelService: true,
    strictDates: false,
    textIndex: false,
    homepage: "https://wikidata.org",
  },
  qlever: {
    id: "qlever",
    label: "Wikidata QLever",
    url: "https://qlever.dev/api/wikidata",
    engine: "qlever",
    labelService: false,
    strictDates: true,
    textIndex: false,
    homepage: "https://qlever.dev",
  },
  dbpedia: {
    id: "dbpedia",
    label: "DBpedia",
    url: "https://dbpedia.org/sparql",
    engine: "virtuoso",
    labelService: false,
    strictDates: false,
    textIndex: true,
    homepage: "https://dbpedia.org",
  },
}

/** Providers offered in the UI selector. `auto` joins the list in the enrichment phase. */
export const SELECTABLE_PROVIDERS: ProviderId[] = ["wikidata", "qlever", "dbpedia"]

export function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(PROVIDERS, value)
  )
}

/**
 * Resolve a provider from a provider id or a legacy full endpoint URL.
 * Unknown values fall back to Wikidata so old clients keep working.
 */
export function resolveProvider(input: unknown): ProviderInfo {
  if (typeof input === "string") {
    if (isProviderId(input)) return PROVIDERS[input]
    // Legacy: full endpoint URLs sent by previous app versions
    if (input.includes("qlever")) return PROVIDERS.qlever
    if (input.includes("dbpedia")) return PROVIDERS.dbpedia
    if (input.includes("wikidata")) return PROVIDERS.wikidata
  }
  return PROVIDERS.wikidata
}
