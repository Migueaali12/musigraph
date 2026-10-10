// ── Server-side SPARQL endpoint resolution (WDQS v1 → v2 cutover) ──────────
// The Wikidata endpoint is configurable without code changes so the Blazegraph
// (v1) → WDQS v2 migration can be staged and rolled back from the environment:
//
//   WDQS_V2_ENABLED=true   switches the provider to query-next.wikidata.org
//   WDQS_ENDPOINT=<url>    explicit override (staging/tests); takes precedence
//
// Precedence: WDQS_ENDPOINT > WDQS_V2_ENABLED > provider default (v1).
// Server-only module: never import it from client components.

import { PROVIDERS, type ProviderInfo } from "./providers"

export const WDQS_V2_URL = "https://query-next.wikidata.org/sparql"

export interface SparqlTarget {
  /** Effective URL used by the executor. */
  url: string
  /** Stable key for monitoring and logs. */
  key: string
  /** Human-readable label for logs. */
  label: string
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function isV2Enabled(): boolean {
  return process.env.WDQS_V2_ENABLED?.trim().toLowerCase() === "true"
}

let warnedInvalidOverride = false

/** Resolve the effective SPARQL endpoint for a provider. */
export function resolveSparqlTarget(provider: ProviderInfo): SparqlTarget {
  if (provider.id !== "wikidata") {
    return { url: provider.url, key: provider.id, label: provider.label }
  }

  const override = process.env.WDQS_ENDPOINT?.trim()
  if (override) {
    if (isValidHttpUrl(override)) {
      const isV2 = override.includes("query-next.wikidata.org")
      return {
        url: override,
        key: isV2 ? "wikidata-v2" : "wikidata-custom",
        label: isV2 ? "Wikidata v2" : "Wikidata (custom)",
      }
    }
    if (!warnedInvalidOverride) {
      warnedInvalidOverride = true
      console.warn(
        "[endpoints] WDQS_ENDPOINT is not a valid http(s) URL; ignoring override"
      )
    }
  }

  if (isV2Enabled()) {
    return { url: WDQS_V2_URL, key: "wikidata-v2", label: "Wikidata v2" }
  }

  return { url: provider.url, key: provider.id, label: provider.label }
}

/** Resolved targets for every SPARQL engine (used by the health probe). */
export function getSparqlTargets(): SparqlTarget[] {
  return [
    resolveSparqlTarget(PROVIDERS.wikidata),
    resolveSparqlTarget(PROVIDERS.qlever),
    resolveSparqlTarget(PROVIDERS.dbpedia),
  ]
}

/** Non-secret endpoint configuration exposed by GET /api/health. */
export function getEndpointConfig() {
  const wikidata = resolveSparqlTarget(PROVIDERS.wikidata)
  return {
    wikidataEndpoint: wikidata.url,
    wikidataMode: wikidata.key,
    wdqsV2Enabled: isV2Enabled(),
    discogsEnabled: Boolean(process.env.DISCOGS_TOKEN),
  }
}
