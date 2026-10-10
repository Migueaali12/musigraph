import type { ProviderInfo } from "./providers"
import type { SparqlResponse } from "./sparqlTypes"
import { isQid } from "@/utils/validation"
import { resolveSparqlTarget } from "./endpoints"
import {
  recordSparqlFailure,
  recordSparqlSuccess,
  recordSparqlThrottle,
} from "./monitoring"

// ── Server-side SPARQL execution ───────────────────────────────────────────
// Single fetch layer used by every engine (Blazegraph, QLever, Virtuoso).
// The `auto` orchestrator tightens timeouts and disables retries so a slow
// primary can fail over to QLever within the route's 30 s budget.
// Outcomes are recorded in the monitoring registry (see /api/health).

export interface QueryRunOptions {
  /** Abort the request after this many ms (default 25 s). */
  timeoutMs?: number
  /** Retry once on 429/502/503/504 (default 1). */
  retries?: number
  /** Record latency/error metrics (default true; health probes opt out). */
  recordMetrics?: boolean
}

const DEFAULT_TIMEOUT_MS = 25_000

export async function executeSparqlQuery(
  query: string,
  provider: ProviderInfo,
  options: QueryRunOptions = {},
  attempt = 0
): Promise<SparqlResponse> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = 1, recordMetrics = true } =
    options
  const target = resolveSparqlTarget(provider)

  // Abort before Next.js hard-kills the function
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()
  const queryPreview = query.replace(/\s+/g, " ").trim().slice(0, 120)
  let httpFailureRecorded = false

  console.log(`[SPARQL] → ${target.label} | query: ${queryPreview}…`)

  try {
    const response = await fetch(target.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/sparql-query",
        Accept: "application/sparql-results+json",
        "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
      },
      body: query,
      signal: controller.signal,
    })

    const elapsed = Date.now() - start

    // Public endpoints throttle with 429 + Retry-After and occasionally
    // return transient 502/503/504: retry once, briefly.
    const retriableStatus = [429, 502, 503, 504]
    if (retriableStatus.includes(response.status) && attempt < retries) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "1")
      const waitMs = Math.min(Math.max(retryAfter, 1), 5) * 1000
      if (recordMetrics) {
        recordSparqlThrottle(target.key, response.status, elapsed)
      }
      console.warn(
        `[SPARQL] ${response.status} from ${target.label}, retrying in ${waitMs} ms`
      )
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      return executeSparqlQuery(query, provider, options, attempt + 1)
    }

    if (!response.ok) {
      if (recordMetrics) {
        recordSparqlFailure(
          target.key,
          "http",
          elapsed,
          `HTTP ${response.status}`
        )
        httpFailureRecorded = true
      }
      console.error(
        `[SPARQL] ✗ ${target.label} HTTP ${response.status} ${response.statusText} (${elapsed} ms)`
      )
      throw new Error(`SPARQL query failed: ${response.statusText}`)
    }

    // Virtuoso (DBpedia) returns partial results with HTTP 200 — surface it in
    // logs and monitoring.
    let partial = false
    if (provider.engine === "virtuoso") {
      const maxRows = response.headers.get("x-sparql-maxrows")
      const sqlMessage = response.headers.get("x-sql-message")
      if (maxRows || sqlMessage) {
        partial = true
        console.warn(
          `[SPARQL] ⚠ ${target.label} returned PARTIAL results (${sqlMessage ?? `maxRows=${maxRows}`})`
        )
      }
    }

    const data = (await response.json()) as SparqlResponse
    const count = data.results?.bindings?.length ?? 0
    if (recordMetrics) {
      recordSparqlSuccess(target.key, elapsed, partial)
    }
    console.log(`[SPARQL] ✓ ${target.label} | ${count} result(s) | ${elapsed} ms`)
    return data
  } catch (err) {
    const elapsed = Date.now() - start
    if (err instanceof Error && err.name === "AbortError") {
      if (recordMetrics) {
        recordSparqlFailure(
          target.key,
          "timeout",
          elapsed,
          `timeout after ${timeoutMs} ms`
        )
      }
      console.error(`[SPARQL] ✗ ${target.label} | TIMEOUT after ${elapsed} ms`)
      throw new Error(`SPARQL query timed out after ${Math.round(timeoutMs / 1000)} seconds`)
    }
    if (!httpFailureRecorded && recordMetrics) {
      recordSparqlFailure(
        target.key,
        "network",
        elapsed,
        err instanceof Error ? err.message : String(err)
      )
    }
    console.error(
      `[SPARQL] ✗ ${target.label} | ${err instanceof Error ? err.message : String(err)} (${elapsed} ms)`
    )
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── Wikidata entity-search via MediaWiki API ───────────────────────────────
// Indexed search — much faster than SPARQL CONTAINS. Runs outside SPARQL so
// the removal of wikibase:mwapi in WDQS v2 does not affect us.

export async function resolveWikidataEntityIds(
  name: string,
  limit = 12
): Promise<string[]> {
  const url = new URL("https://www.wikidata.org/w/api.php")
  url.searchParams.set("action", "wbsearchentities")
  url.searchParams.set("search", name)
  url.searchParams.set("language", "en")
  url.searchParams.set("uselang", "en")
  url.searchParams.set("type", "item")
  url.searchParams.set("format", "json")
  url.searchParams.set("limit", String(limit))

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8_000)
  const start = Date.now()

  try {
    console.log(`[wbsearch] → searching "${name}" (limit ${limit})`)
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "MusiGraph/1.0 (https://musigraph.app)" },
      signal: controller.signal,
    })
    if (!res.ok) {
      console.warn(`[wbsearch] ✗ HTTP ${res.status} (${Date.now() - start} ms)`)
      return []
    }
    const data = (await res.json()) as { search?: { id: string }[] }
    const ids = (data.search ?? []).map((item) => item.id).filter(isQid)
    console.log(`[wbsearch] ✓ ${ids.length} entity ID(s) in ${Date.now() - start} ms → ${ids.join(", ")}`)
    return ids
  } catch (err) {
    console.warn(`[wbsearch] ✗ ${err instanceof Error ? err.message : String(err)} (${Date.now() - start} ms)`)
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}
