import { type NextRequest, NextResponse } from "next/server"
import { resolveProvider, type Lang } from "@/services/providers"
import { emptyResponse, type SparqlResponse } from "@/services/sparqlTypes"
import { TtlCache } from "@/services/serverCache"
import {
  getCollaborations,
  getDiscography,
  getInfluences,
  getTopBands,
  searchArtist,
  searchByGenre,
} from "@/services/actions"
import {
  artistEnrichment,
  autoCollaborations,
  autoDiscography,
  autoInfluences,
  autoSearchArtist,
  autoSearchByGenre,
  autoTopBands,
  musicBrainzDiscographyResponse,
  withMusicBrainzFallback,
} from "@/services/enrichment/orchestrator"
import {
  isAllowedDecade,
  isDbpediaResource,
  isDiscogsId,
  isMbid,
  isQid,
  sanitizeSearchTerm,
} from "@/utils/validation"

// Allow up to 30 s for outbound SPARQL + enrichment calls (Vercel / Next.js)
export const maxDuration = 30

// ── Types ──────────────────────────────────────────────────────────────────

type SparqlAction =
  | "searchArtist"
  | "getArtistDiscography"
  | "getArtistInfluences"
  | "getCollaborations"
  | "searchByGenre"
  | "getTopBands"
  | "getArtistEnrichment"

interface SparqlRequestBody {
  action: SparqlAction
  params: Record<string, string | undefined>
}

// ── Response cache (per serverless instance) ───────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const responseCache = new TtlCache<SparqlResponse>(300, CACHE_TTL_MS)

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
    const isAuto = provider.id === "auto"

    // Validate everything that gets interpolated into SPARQL (or sent to an
    // external API) before it reaches a query builder.
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
    if (params.mbid !== undefined && params.mbid !== "" && !isMbid(params.mbid)) {
      return badRequest("Invalid MusicBrainz id")
    }
    if (params.discogsId !== undefined && params.discogsId !== "" && !isDiscogsId(params.discogsId)) {
      return badRequest("Invalid Discogs id")
    }
    if (params.source !== undefined && params.source !== "" && params.source !== "musicbrainz") {
      return badRequest("Invalid source")
    }
    if (
      action === "getArtistDiscography" &&
      params.source === "musicbrainz" &&
      !isMbid(params.mbid ?? "")
    ) {
      return badRequest("mbid required for the MusicBrainz source")
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
        mbid: params.mbid ?? "",
        discogsId: params.discogsId ?? "",
        source: params.source ?? "",
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
        result = isAuto
          ? await autoSearchArtist(params.name ?? "", params, lang)
          : await searchArtist(params.name ?? "", params, provider, lang)
        break

      case "getArtistDiscography":
        if (!params.artistId) return badRequest("artistId required")
        if (params.source === "musicbrainz") {
          result = await musicBrainzDiscographyResponse(params.mbid as string)
        } else if (isAuto) {
          result = await autoDiscography(params.artistId, lang, {
            mbid: params.mbid,
            discogsId: params.discogsId,
            name: params.name,
          })
        } else {
          result = await withMusicBrainzFallback(
            await getDiscography(params.artistId, provider, lang),
            params.mbid
          )
        }
        break

      case "getArtistInfluences":
        if (!params.artistId) return badRequest("artistId required")
        result = isAuto
          ? await autoInfluences(params.artistId, lang, { mbid: params.mbid })
          : await getInfluences(params.artistId, provider, lang)
        break

      case "getCollaborations":
        if (!params.artistId) return badRequest("artistId required")
        result = isAuto
          ? await autoCollaborations(params.artistId, lang, { mbid: params.mbid })
          : await getCollaborations(params.artistId, provider, lang)
        break

      case "searchByGenre":
        if (!params.genreId) return badRequest("genreId required")
        result = isAuto
          ? await autoSearchByGenre(params.genreId, lang)
          : await searchByGenre(params.genreId, provider, lang)
        break

      case "getTopBands":
        result = isAuto
          ? await autoTopBands(lang)
          : await getTopBands(provider, lang)
        break

      case "getArtistEnrichment":
        if (!params.artistId) return badRequest("artistId required")
        // DBpedia resources cannot be resolved against Wikidata identity.
        result =
          provider.engine === "virtuoso"
            ? emptyResponse()
            : await artistEnrichment(params.artistId, lang, { mbid: params.mbid })
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
