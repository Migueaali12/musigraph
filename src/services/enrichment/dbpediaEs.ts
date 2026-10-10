import { TtlCache } from "../serverCache"

// ── DBpedia Spanish abstracts ──────────────────────────────────────────────
// es.dbpedia.org keeps `dbo:abstract` in Spanish (the English core endpoint
// no longer exposes abstracts). The resource is derived from the eswiki
// sitelink title — the same join key used for the Wikipedia summary.

const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const cache = new TtlCache<string | null>(300, CACHE_TTL_MS)
const ENDPOINT = "https://es.dbpedia.org/sparql"
const USER_AGENT = "MusiGraph/1.0 (https://musigraph.app)"

export async function getDbpediaEsAbstract(title: string): Promise<string | null> {
  const cached = cache.get(title)
  if (cached !== undefined) return cached

  const resource = `http://es.dbpedia.org/resource/${encodeURIComponent(
    title.replace(/ /g, "_")
  )}`
  const query = `PREFIX dbo: <http://dbpedia.org/ontology/>
SELECT ?abstract WHERE {
  <${resource}> dbo:abstract ?abstract .
  FILTER(lang(?abstract) = "es")
}
LIMIT 1`

  // GET (not POST): es.dbpedia's Virtuoso hangs on POST for this query shape.
  const url = new URL(ENDPOINT)
  url.searchParams.set("query", query)
  url.searchParams.set("format", "json")

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6_000)
  const start = Date.now()

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`DBpedia ES error: ${res.status}`)

    const data = (await res.json()) as {
      results?: { bindings?: { abstract?: { value?: string } }[] }
    }
    const abstract = data.results?.bindings?.[0]?.abstract?.value?.trim() ?? null

    cache.set(title, abstract)
    console.log(
      `[enrichment] dbpedia-es "${title}" in ${Date.now() - start} ms (${abstract ? `${abstract.length} chars` : "empty"})`
    )
    return abstract
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("DBpedia ES timed out")
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
