import type { Lang, ProviderInfo } from "./providers"
import { emptyResponse, type SparqlResponse, type SearchFilters } from "./sparqlTypes"
import type { SourceId } from "./sources"
import { executeSparqlQuery, resolveWikidataEntityIds, type QueryRunOptions } from "./sparqlExecutor"
import {
  attachLabels,
  attachWorkTypes,
  mergeResponses,
  COLLABORATION_LABEL_TARGETS,
  DBPEDIA_DISCOGRAPHY_LABEL_TARGETS,
  DISCOGRAPHY_LABEL_TARGETS,
  INFLUENCE_LABEL_TARGETS,
  SEARCH_LABEL_TARGETS,
} from "./sparqlPostprocess"
import {
  buildArtistProfileQuery,
  buildArtistTraitsQuery,
  buildCollaborationsQuery,
  buildDiscographyQuery,
  buildGenreSearchQuery,
  buildInfluencesQuery,
} from "./queries/wikidata"
import {
  buildDbpediaArtistSearchQuery,
  buildDbpediaArtistTraitsQuery,
  buildDbpediaCollaborationsQuery,
  buildDbpediaDiscographyQuery,
  buildDbpediaInfluencesQuery,
} from "./queries/dbpedia"
import { FEATURED_ARTIST_IDS } from "@/utils/constants"
import { sanitizeSearchTerm, sanitizeTextIndexTerm } from "@/utils/validation"

// ── Explicit-provider actions (wikidata / qlever / dbpedia) ────────────────
// The `auto` orchestrator reuses these against Wikidata (with a QLever
// failover) and merges the REST-source enrichment on top.

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

/** Map a provider to its provenance source id. */
function providerSource(provider: ProviderInfo): SourceId {
  if (provider.id === "qlever") return "qlever"
  if (provider.id === "dbpedia") return "dbpedia"
  return "wikidata"
}

/** Annotate every binding row with the source that produced it. */
function tagRows(response: SparqlResponse, source: SourceId): void {
  for (const row of response.results.bindings) {
    if (!row.source) row.source = { type: "literal", value: source }
  }
}

/**
 * Run the profile + traits query pair for a set of artist ids.
 * Split in two to avoid cartesian products from multi-valued properties
 * (genres × occupations × instruments) blowing up the result set.
 */
async function runArtistQueries(
  artistIds: string[],
  filters: SearchFilters,
  provider: ProviderInfo,
  lang: Lang,
  run?: QueryRunOptions
): Promise<SparqlResponse> {
  const [profileResult, traitsResult] = await Promise.allSettled([
    executeSparqlQuery(
      buildArtistProfileQuery(artistIds, filters, provider.engine, lang),
      provider,
      run
    ),
    executeSparqlQuery(
      buildArtistTraitsQuery(artistIds, provider.engine, lang),
      provider,
      run
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

  const merged = mergeResponses(responses)
  tagRows(merged, providerSource(provider))
  return merged
}

export async function searchArtist(
  name: string,
  filters: SearchFilters,
  provider: ProviderInfo,
  lang: Lang,
  run?: QueryRunOptions
): Promise<SparqlResponse> {
  // DBpedia has no entity-resolution API here: search by indexed label text.
  if (provider.engine === "virtuoso") {
    const term = sanitizeTextIndexTerm(name)
    if (!term) return emptyResponse()
    const query = buildDbpediaArtistSearchQuery(term, lang, { decade: filters.decade })
    const response = await executeSparqlQuery(query, provider, run)

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
          provider,
          run
        )
        response.results.bindings.push(...traits.results.bindings)
      } catch (err) {
        console.warn(
          `[SPARQL] DBpedia traits batch failed: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    tagRows(response, "dbpedia")
    return response
  }

  const trimmedName = sanitizeSearchTerm(name)

  let artistIds: string[]
  if (trimmedName) {
    artistIds = await resolveWikidataEntityIds(trimmedName)
    if (artistIds.length === 0) {
      console.log(`[searchArtist] No entity IDs found for "${trimmedName}", returning empty`)
      return emptyResponse()
    }
  } else {
    artistIds = [...FEATURED_ARTIST_IDS]
  }

  return runArtistQueries(
    artistIds,
    { genre: filters.genre, decade: filters.decade },
    provider,
    lang,
    run
  )
}

export async function getDiscography(
  artistId: string,
  provider: ProviderInfo,
  lang: Lang,
  run?: QueryRunOptions
): Promise<SparqlResponse> {
  if (provider.engine === "virtuoso") {
    const response = await executeSparqlQuery(buildDbpediaDiscographyQuery(artistId), provider, run)
    await attachLabels([response], DBPEDIA_DISCOGRAPHY_LABEL_TARGETS, lang, provider)
    tagRows(response, "dbpedia")
    return response
  }

  const query = buildDiscographyQuery(artistId, provider.engine, lang)
  const response = await executeSparqlQuery(query, provider, run)

  if (provider.engine === "qlever") {
    await attachLabels([response], DISCOGRAPHY_LABEL_TARGETS, lang, provider)
  }

  tagRows(response, providerSource(provider))
  return response
}

export async function getInfluences(
  artistId: string,
  provider: ProviderInfo,
  lang: Lang,
  run?: QueryRunOptions
): Promise<SparqlResponse> {
  if (provider.engine === "virtuoso") {
    const response = await executeSparqlQuery(buildDbpediaInfluencesQuery(artistId), provider, run)
    await attachLabels([response], INFLUENCE_LABEL_TARGETS, lang, provider)
    tagRows(response, "dbpedia")
    return response
  }

  const query = buildInfluencesQuery(artistId, provider.engine, lang)
  const response = await executeSparqlQuery(query, provider, run)

  if (provider.engine === "qlever") {
    await attachLabels([response], INFLUENCE_LABEL_TARGETS, lang, provider)
  }

  tagRows(response, providerSource(provider))
  return response
}

export async function getCollaborations(
  artistId: string,
  provider: ProviderInfo,
  lang: Lang,
  run?: QueryRunOptions
): Promise<SparqlResponse> {
  if (provider.engine === "virtuoso") {
    const response = await executeSparqlQuery(buildDbpediaCollaborationsQuery(artistId), provider, run)
    await attachLabels([response], COLLABORATION_LABEL_TARGETS, lang, provider)
    tagRows(response, "dbpedia")
    return response
  }

  const query = buildCollaborationsQuery(artistId, provider.engine, lang)
  const response = await executeSparqlQuery(query, provider, run)

  // Song/album classification for both engines (batched, cheap).
  await attachWorkTypes(response, "work", provider)

  if (provider.engine === "qlever") {
    await attachLabels([response], COLLABORATION_LABEL_TARGETS, lang, provider)
  }

  tagRows(response, providerSource(provider))
  return response
}

export async function searchByGenre(
  genreId: string,
  provider: ProviderInfo,
  lang: Lang,
  run?: QueryRunOptions
): Promise<SparqlResponse> {
  const query = buildGenreSearchQuery(genreId, provider.engine, lang)
  const response = await executeSparqlQuery(query, provider, run)

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

  tagRows(response, providerSource(provider))
  return response
}

export async function getTopBands(
  provider: ProviderInfo,
  lang: Lang,
  run?: QueryRunOptions
): Promise<SparqlResponse> {
  return runArtistQueries(
    [...FEATURED_ARTIST_IDS].slice(0, 5),
    {},
    provider,
    lang,
    run
  )
}
