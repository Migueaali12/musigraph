import { type NextRequest, NextResponse } from "next/server"
import { resolveProvider, type Lang, type ProviderInfo } from "@/services/providers"
import {
  buildArtistProfileQuery,
  buildArtistTraitsQuery,
  buildBatchLabelsQuery,
  buildCollaborationsQuery,
  buildDiscographyQuery,
  buildGenreSearchQuery,
  buildInfluencesQuery,
  buildWorkTypeQuery,
} from "@/services/queries/wikidata"
import {
  buildDbpediaArtistSearchQuery,
  buildDbpediaArtistTraitsQuery,
  buildDbpediaCollaborationsQuery,
  buildDbpediaDiscographyQuery,
  buildDbpediaInfluencesQuery,
} from "@/services/queries/dbpedia"
import { TtlCache } from "@/services/serverCache"
import { FEATURED_ARTIST_IDS } from "@/utils/constants"
import {
  isAllowedDecade,
  isDbpediaResource,
  isQid,
  sanitizeSearchTerm,
  sanitizeTextIndexTerm,
} from "@/utils/validation"

// Allow up to 30 s for outbound SPARQL calls (Vercel / Next.js serverless)
export const maxDuration = 30

// ── Types ──────────────────────────────────────────────────────────────────

interface SparqlBinding {
  [key: string]: { value: string; type: string; "xml:lang"?: string; datatype?: string }
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] }
}

type SparqlAction =
  | "searchArtist"
  | "getArtistDiscography"
  | "getArtistInfluences"
  | "getCollaborations"
  | "searchByGenre"
  | "getTopBands"

interface SparqlRequestBody {
  action: SparqlAction
  params: Record<string, string | undefined>
}

const EMPTY_RESPONSE: SparqlResponse = { results: { bindings: [] } }

// ── Response cache (per serverless instance) ───────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const responseCache = new TtlCache<SparqlResponse>(300, CACHE_TTL_MS)

// ── Core fetch (server-side only — endpoint URLs never reach the client) ───

async function executeSparqlQuery(
  query: string,
  provider: ProviderInfo,
  attempt = 0
): Promise<SparqlResponse> {
  // Abort after 25 s so we return a clean error before Next.js hard-kills the function
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25_000)
  const start = Date.now()
  const queryPreview = query.replace(/\s+/g, " ").trim().slice(0, 120)

  console.log(`[SPARQL] → ${provider.label} | query: ${queryPreview}…`)

  try {
    const response = await fetch(provider.url, {
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
    if (retriableStatus.includes(response.status) && attempt < 1) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "1")
      const waitMs = Math.min(Math.max(retryAfter, 1), 5) * 1000
      console.warn(
        `[SPARQL] ${response.status} from ${provider.label}, retrying in ${waitMs} ms`
      )
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      return executeSparqlQuery(query, provider, attempt + 1)
    }

    if (!response.ok) {
      console.error(
        `[SPARQL] ✗ ${provider.label} HTTP ${response.status} ${response.statusText} (${elapsed} ms)`
      )
      throw new Error(`SPARQL query failed: ${response.statusText}`)
    }

    // Virtuoso (DBpedia) returns partial results with HTTP 200 — surface it in logs.
    if (provider.engine === "virtuoso") {
      const maxRows = response.headers.get("x-sparql-maxrows")
      const sqlMessage = response.headers.get("x-sql-message")
      if (maxRows || sqlMessage) {
        console.warn(
          `[SPARQL] ⚠ ${provider.label} returned PARTIAL results (${sqlMessage ?? `maxRows=${maxRows}`})`
        )
      }
    }

    const data = (await response.json()) as SparqlResponse
    const count = data.results?.bindings?.length ?? 0
    console.log(`[SPARQL] ✓ ${provider.label} | ${count} result(s) | ${elapsed} ms`)
    return data
  } catch (err) {
    const elapsed = Date.now() - start
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[SPARQL] ✗ ${provider.label} | TIMEOUT after ${elapsed} ms`)
      throw new Error("SPARQL query timed out after 25 seconds")
    }
    console.error(
      `[SPARQL] ✗ ${provider.label} | ${err instanceof Error ? err.message : String(err)} (${elapsed} ms)`
    )
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── Wikidata entity-search via MediaWiki API (indexed — much faster than SPARQL CONTAINS) ───
// v2-compatible design: the MediaWiki API call already happens outside SPARQL,
// so the removal of wikibase:mwapi in WDQS v2 does not affect us.

async function resolveWikidataEntityIds(
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

// ── Batched post-processing (QLever has no label service) ──────────────────

interface LabelTarget {
  entityVar: string
  labelVar: string
  descriptionVar?: string
}

const SEARCH_LABEL_TARGETS: LabelTarget[] = [
  { entityVar: "artist", labelVar: "artistLabel", descriptionVar: "artistDescription" },
  { entityVar: "country", labelVar: "countryLabel" },
  { entityVar: "genre", labelVar: "genreLabel" },
  { entityVar: "instrument", labelVar: "instrumentLabel" },
  { entityVar: "instanceType", labelVar: "instanceTypeLabel" },
  { entityVar: "occupation", labelVar: "occupationLabel" },
]

const DISCOGRAPHY_LABEL_TARGETS: LabelTarget[] = [
  { entityVar: "album", labelVar: "albumLabel" },
  { entityVar: "label", labelVar: "labelLabel" },
  { entityVar: "genre", labelVar: "genreLabel" },
  { entityVar: "albumType", labelVar: "albumTypeLabel" },
]

const DBPEDIA_DISCOGRAPHY_LABEL_TARGETS: LabelTarget[] = [
  { entityVar: "album", labelVar: "albumLabel" },
  { entityVar: "label", labelVar: "labelLabel" },
  { entityVar: "genre", labelVar: "genreLabel" },
]

const INFLUENCE_LABEL_TARGETS: LabelTarget[] = [
  { entityVar: "influence", labelVar: "influenceLabel" },
  { entityVar: "country", labelVar: "countryLabel" },
  { entityVar: "genre", labelVar: "genreLabel" },
]

const COLLABORATION_LABEL_TARGETS: LabelTarget[] = [
  { entityVar: "work", labelVar: "workLabel" },
  { entityVar: "collaborator", labelVar: "collaboratorLabel" },
]

/** Resolve labels (and optionally descriptions) for every entity in result sets. */
async function attachLabels(
  responses: SparqlResponse[],
  targets: LabelTarget[],
  lang: Lang,
  provider: ProviderInfo
): Promise<void> {
  const bindings = responses.flatMap((response) => response.results.bindings)
  const entities = new Set<string>()

  for (const row of bindings) {
    for (const target of targets) {
      const value = row[target.entityVar]?.value
      if (value?.startsWith("http")) entities.add(value)
    }
  }
  if (entities.size === 0) return

  const needsDescriptions = targets.some((target) => target.descriptionVar)

  try {
    const query = buildBatchLabelsQuery([...entities], lang, {
      descriptions: needsDescriptions,
    })
    const labelResponse = await executeSparqlQuery(query, provider)

    const resolved = new Map<string, { label?: string; description?: string }>()
    for (const row of labelResponse.results.bindings) {
      const uri = row.entity?.value
      if (!uri) continue
      const entry = resolved.get(uri) ?? {}
      if (!entry.label && row.entityLabel?.value) entry.label = row.entityLabel.value
      if (!entry.description && row.entityDescription?.value) {
        entry.description = row.entityDescription.value
      }
      resolved.set(uri, entry)
    }

    for (const row of bindings) {
      for (const target of targets) {
        const uri = row[target.entityVar]?.value
        const hit = uri ? resolved.get(uri) : undefined
        if (!hit) continue
        if (hit.label && !row[target.labelVar]) {
          row[target.labelVar] = { type: "literal", value: hit.label, "xml:lang": lang }
        }
        if (target.descriptionVar && hit.description && !row[target.descriptionVar]) {
          row[target.descriptionVar] = {
            type: "literal",
            value: hit.description,
            "xml:lang": lang,
          }
        }
      }
    }
  } catch (err) {
    // Labels are an enhancement: never fail the whole request over them.
    console.warn(
      `[SPARQL] label batch failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/** Classify collaboration works as songs or albums in a batched pass. */
async function attachWorkTypes(
  response: SparqlResponse,
  entityVar: string,
  provider: ProviderInfo
): Promise<void> {
  const bindings = response.results.bindings
  const works = [
    ...new Set(
      bindings
        .map((row) => row[entityVar]?.value)
        .filter((value): value is string => Boolean(value?.startsWith("http")))
    ),
  ]
  if (works.length === 0) return

  try {
    const typeResponse = await executeSparqlQuery(buildWorkTypeQuery(works), provider)
    const albumWorks = new Set(
      typeResponse.results.bindings
        .map((row) => row.entity?.value)
        .filter((value): value is string => Boolean(value))
    )
    for (const row of bindings) {
      const uri = row[entityVar]?.value
      if (!uri) continue
      // Anything not returned by the release-type query is a song.
      row.workType = { type: "literal", value: albumWorks.has(uri) ? "album" : "song" }
    }
  } catch (err) {
    console.warn(
      `[SPARQL] work-type batch failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

// ── Action handlers ────────────────────────────────────────────────────────

/** ?prop URI → trait field mapping used by the traits query. */
const TRAIT_PROPERTY_MAP: Record<string, { entityVar: string; labelVar: string }> = {
  "http://www.wikidata.org/prop/direct/P136": { entityVar: "genre", labelVar: "genreLabel" },
  "http://www.wikidata.org/prop/direct/P1303": { entityVar: "instrument", labelVar: "instrumentLabel" },
  "http://www.wikidata.org/prop/direct/P31": { entityVar: "instanceType", labelVar: "instanceTypeLabel" },
  "http://www.wikidata.org/prop/direct/P106": { entityVar: "occupation", labelVar: "occupationLabel" },
}

/** Rewrite ?prop/?trait rows into the named fields consumers expect. */
function mapTraitBindings(response: SparqlResponse): void {
  for (const row of response.results.bindings) {
    const prop = row.prop?.value
    const mapping = prop ? TRAIT_PROPERTY_MAP[prop] : undefined
    if (!mapping) continue
    if (row.trait) row[mapping.entityVar] = row.trait
    if (row.traitLabel) row[mapping.labelVar] = row.traitLabel
    delete row.prop
    delete row.trait
    delete row.traitLabel
  }
}

function mergeResponses(responses: SparqlResponse[]): SparqlResponse {
  return {
    results: {
      bindings: responses.flatMap((response) => response.results.bindings),
    },
  }
}

/**
 * Run the profile + traits query pair for a set of artist ids.
 * Split in two to avoid cartesian products from multi-valued properties
 * (genres × occupations × instruments) blowing up the result set.
 */
async function runArtistQueries(
  artistIds: string[],
  filters: { genre?: string; decade?: string },
  provider: ProviderInfo,
  lang: Lang
): Promise<SparqlResponse> {
  const [profileResult, traitsResult] = await Promise.allSettled([
    executeSparqlQuery(
      buildArtistProfileQuery(artistIds, filters, provider.engine, lang),
      provider
    ),
    executeSparqlQuery(
      buildArtistTraitsQuery(artistIds, provider.engine, lang),
      provider
    ),
  ])

  // The profile is essential; traits are an enhancement.
  if (profileResult.status === "rejected") throw profileResult.reason
  const responses = [profileResult.value]
  if (traitsResult.status === "fulfilled") {
    // Keep only traits of artists that passed the profile filters (e.g. decade),
    // otherwise filtered-out artists would appear as nameless ghosts.
    const profileArtists = new Set(
      profileResult.value.results.bindings
        .map((row) => row.artist?.value)
        .filter((value): value is string => Boolean(value))
    )
    traitsResult.value.results.bindings = traitsResult.value.results.bindings.filter(
      (row) => {
        const uri = row.artist?.value
        return Boolean(uri && profileArtists.has(uri))
      }
    )
    mapTraitBindings(traitsResult.value)
    responses.push(traitsResult.value)
  } else {
    console.warn(
      `[SPARQL] traits query failed: ${traitsResult.reason instanceof Error ? traitsResult.reason.message : String(traitsResult.reason)}`
    )
  }

  if (provider.engine === "qlever") {
    await attachLabels(responses, SEARCH_LABEL_TARGETS, lang, provider)
  }

  return mergeResponses(responses)
}

async function searchArtist(
  name: string,
  filters: Record<string, string | undefined>,
  provider: ProviderInfo,
  lang: Lang
): Promise<SparqlResponse> {
  // DBpedia has no entity-resolution API here: search by indexed label text.
  if (provider.engine === "virtuoso") {
    const term = sanitizeTextIndexTerm(name)
    if (!term) return EMPTY_RESPONSE
    const query = buildDbpediaArtistSearchQuery(term, lang, { decade: filters.decade })
    const response = await executeSparqlQuery(query, provider)

    // Batched genre/country/instrument enrichment for the matched artists.
    const artistUris = [
      ...new Set(
        response.results.bindings
          .map((row) => row.artist?.value)
          .filter((value): value is string => Boolean(value))
      ),
    ]
    if (artistUris.length > 0) {
      try {
        const traits = await executeSparqlQuery(
          buildDbpediaArtistTraitsQuery(artistUris, lang),
          provider
        )
        response.results.bindings.push(...traits.results.bindings)
      } catch (err) {
        console.warn(
          `[SPARQL] DBpedia traits batch failed: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    return response
  }

  const trimmedName = sanitizeSearchTerm(name)

  let artistIds: string[]
  if (trimmedName) {
    artistIds = await resolveWikidataEntityIds(trimmedName)
    if (artistIds.length === 0) {
      console.log(`[searchArtist] No entity IDs found for "${trimmedName}", returning empty`)
      return EMPTY_RESPONSE
    }
  } else {
    artistIds = [...FEATURED_ARTIST_IDS]
  }

  return runArtistQueries(
    artistIds,
    { genre: filters.genre, decade: filters.decade },
    provider,
    lang
  )
}

async function getDiscography(
  artistId: string,
  provider: ProviderInfo,
  lang: Lang
): Promise<SparqlResponse> {
  if (provider.engine === "virtuoso") {
    const response = await executeSparqlQuery(buildDbpediaDiscographyQuery(artistId), provider)
    await attachLabels([response], DBPEDIA_DISCOGRAPHY_LABEL_TARGETS, lang, provider)
    return response
  }

  const query = buildDiscographyQuery(artistId, provider.engine, lang)
  const response = await executeSparqlQuery(query, provider)

  if (provider.engine === "qlever") {
    await attachLabels([response], DISCOGRAPHY_LABEL_TARGETS, lang, provider)
  }

  return response
}

async function getInfluences(
  artistId: string,
  provider: ProviderInfo,
  lang: Lang
): Promise<SparqlResponse> {
  if (provider.engine === "virtuoso") {
    const response = await executeSparqlQuery(buildDbpediaInfluencesQuery(artistId), provider)
    await attachLabels([response], INFLUENCE_LABEL_TARGETS, lang, provider)
    return response
  }

  const query = buildInfluencesQuery(artistId, provider.engine, lang)
  const response = await executeSparqlQuery(query, provider)

  if (provider.engine === "qlever") {
    await attachLabels([response], INFLUENCE_LABEL_TARGETS, lang, provider)
  }

  return response
}

async function getCollaborations(
  artistId: string,
  provider: ProviderInfo,
  lang: Lang
): Promise<SparqlResponse> {
  if (provider.engine === "virtuoso") {
    const response = await executeSparqlQuery(buildDbpediaCollaborationsQuery(artistId), provider)
    await attachLabels([response], COLLABORATION_LABEL_TARGETS, lang, provider)
    return response
  }

  const query = buildCollaborationsQuery(artistId, provider.engine, lang)
  const response = await executeSparqlQuery(query, provider)

  // Song/album classification for both engines (batched, cheap).
  await attachWorkTypes(response, "work", provider)

  if (provider.engine === "qlever") {
    await attachLabels([response], COLLABORATION_LABEL_TARGETS, lang, provider)
  }

  return response
}

async function searchByGenre(
  genreId: string,
  provider: ProviderInfo,
  lang: Lang
): Promise<SparqlResponse> {
  const query = buildGenreSearchQuery(genreId, provider.engine, lang)
  const response = await executeSparqlQuery(query, provider)

  if (provider.engine === "qlever") {
    await attachLabels(
      [response],
      [
        { entityVar: "artist", labelVar: "artistLabel" },
        { entityVar: "country", labelVar: "countryLabel" },
      ],
      lang,
      provider
    )
  }

  return response
}

async function getTopBands(provider: ProviderInfo, lang: Lang): Promise<SparqlResponse> {
  return runArtistQueries(
    [...FEATURED_ARTIST_IDS].slice(0, 5),
    {},
    provider,
    lang
  )
}

// ── Route Handler ──────────────────────────────────────────────────────────

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const reqStart = Date.now()

  try {
    const body = (await request.json()) as SparqlRequestBody
    const { action, params } = body

    const provider = resolveProvider(params.provider ?? params.endpoint)
    const lang: Lang = params.lang === "en" ? "en" : "es"

    // Validate everything that gets interpolated into SPARQL.
    if (params.genre !== undefined && params.genre !== "" && !isQid(params.genre)) {
      return badRequest("Invalid genre id")
    }
    if (params.decade !== undefined && params.decade !== "" && !isAllowedDecade(params.decade)) {
      return badRequest("Invalid decade")
    }
    if (params.artistId !== undefined && params.artistId !== "") {
      const validArtistId =
        provider.engine === "virtuoso"
          ? isDbpediaResource(params.artistId)
          : isQid(params.artistId)
      if (!validArtistId) return badRequest("Invalid artist id")
    }
    if (params.genreId !== undefined && params.genreId !== "" && !isQid(params.genreId)) {
      return badRequest("Invalid genre id")
    }

    const cacheKey = JSON.stringify({
      action,
      provider: provider.id,
      lang,
      params: {
        name: sanitizeSearchTerm(params.name ?? ""),
        genre: params.genre ?? "",
        decade: params.decade ?? "",
        artistId: params.artistId ?? "",
        genreId: params.genreId ?? "",
      },
    })
    const cached = responseCache.get(cacheKey)
    if (cached) {
      console.log(
        `[API /sparql] ⚡ cache hit action="${action}" provider=${provider.label} lang=${lang}`
      )
      return NextResponse.json(cached)
    }

    console.log(
      `[API /sparql] ← action="${action}" provider=${provider.label} lang=${lang} params=${JSON.stringify(params)}`
    )

    let result: SparqlResponse

    switch (action) {
      case "searchArtist":
        result = await searchArtist(params.name ?? "", params, provider, lang)
        break

      case "getArtistDiscography":
        if (!params.artistId) return badRequest("artistId required")
        result = await getDiscography(params.artistId, provider, lang)
        break

      case "getArtistInfluences":
        if (!params.artistId) return badRequest("artistId required")
        result = await getInfluences(params.artistId, provider, lang)
        break

      case "getCollaborations":
        if (!params.artistId) return badRequest("artistId required")
        result = await getCollaborations(params.artistId, provider, lang)
        break

      case "searchByGenre":
        if (!params.genreId) return badRequest("genreId required")
        result = await searchByGenre(params.genreId, provider, lang)
        break

      case "getTopBands":
        result = await getTopBands(provider, lang)
        break

      default:
        console.warn(`[API /sparql] Unknown action: "${action}"`)
        return badRequest("Unknown action")
    }

    responseCache.set(cacheKey, result)

    const totalMs = Date.now() - reqStart
    const count = result.results?.bindings?.length ?? 0
    console.log(`[API /sparql] ✓ action="${action}" | ${count} binding(s) | total ${totalMs} ms`)

    return NextResponse.json(result)
  } catch (error) {
    const totalMs = Date.now() - reqStart
    const message = error instanceof Error ? error.message : "SPARQL query failed"
    console.error(`[API /sparql] ✗ ${message} | total ${totalMs} ms`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
