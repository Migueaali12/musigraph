import { TtlCache } from "../serverCache"
import type { Lang } from "../providers"

// ── Wikidata identity resolution (MediaWiki API, not SPARQL) ───────────────
// Resolves the join keys used by the enrichment sources in one cached call:
//   * Wikipedia sitelink titles (en/es) → Wikipedia REST + es.dbpedia
//   * external ids: P434 (MusicBrainz), P1953 (Discogs), P1902 (Spotify),
//     P3192 (Last.fm), P1728 (AllMusic)
//   * short descriptions (UI language, then the other app language)
//
// wbgetentities is v2-proof (no wikibase:mwapi) and avoids extra WDQS load.

export interface ResolvedArtistData {
  sitelinks: { en?: string; es?: string }
  description?: string
  mbid?: string
  discogsId?: string
  spotifyId?: string
  lastfmId?: string
  allmusicId?: string
}

interface WbEntity {
  sitelinks?: Record<string, { title?: string }>
  descriptions?: Record<string, { value?: string }>
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const cache = new TtlCache<ResolvedArtistData>(500, CACHE_TTL_MS)
// In-flight coalescing: the profile fans out to several actions in parallel,
// so a cold cache must not trigger one wbgetentities call per action.
const inflight = new Map<string, Promise<ResolvedArtistData>>()
const USER_AGENT = "MusiGraph/1.0 (https://musigraph.app)"

const ID_PROPERTIES: Record<keyof Pick<ResolvedArtistData, "mbid" | "discogsId" | "spotifyId" | "lastfmId" | "allmusicId">, string> = {
  mbid: "P434",
  discogsId: "P1953",
  spotifyId: "P1902",
  lastfmId: "P3192",
  allmusicId: "P1728",
}

function claimValue(entity: WbEntity | undefined, property: string): string | undefined {
  const value = entity?.claims?.[property]?.[0]?.mainsnak?.datavalue?.value
  return typeof value === "string" && value.length > 0 ? value : undefined
}

export async function resolveArtistData(qid: string, lang: Lang = "es"): Promise<ResolvedArtistData> {
  // The description is language-dependent, so it is part of the cache key.
  const cacheKey = `${qid}:${lang}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const pending = inflight.get(cacheKey)
  if (pending) return pending

  const promise = fetchResolvedArtistData(qid, lang, cacheKey)
  inflight.set(cacheKey, promise)
  return promise
}

async function fetchResolvedArtistData(
  qid: string,
  lang: Lang,
  cacheKey: string
): Promise<ResolvedArtistData> {
  const url = new URL("https://www.wikidata.org/w/api.php")
  url.searchParams.set("action", "wbgetentities")
  url.searchParams.set("ids", qid)
  url.searchParams.set("props", "sitelinks|claims|descriptions")
  url.searchParams.set("sitefilter", "enwiki|eswiki")
  url.searchParams.set("languages", "es|en")
  url.searchParams.set("format", "json")

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8_000)
  const start = Date.now()

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`Wikidata API error: ${res.status}`)
    }

    const data = (await res.json()) as { entities?: Record<string, WbEntity> }
    const entity = data.entities?.[qid]
    const otherLang: Lang = lang === "es" ? "en" : "es"

    const resolved: ResolvedArtistData = {
      sitelinks: {
        en: entity?.sitelinks?.enwiki?.title,
        es: entity?.sitelinks?.eswiki?.title,
      },
      description:
        entity?.descriptions?.[lang]?.value ?? entity?.descriptions?.[otherLang]?.value,
    }

    for (const [key, property] of Object.entries(ID_PROPERTIES)) {
      resolved[key as keyof typeof ID_PROPERTIES] = claimValue(entity, property)
    }

    cache.set(cacheKey, resolved)
    console.log(
      `[enrichment] resolved ${qid} in ${Date.now() - start} ms (mbid=${resolved.mbid ?? "—"}, discogs=${resolved.discogsId ?? "—"})`
    )
    return resolved
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Wikidata API timed out")
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
    inflight.delete(cacheKey)
  }
}
