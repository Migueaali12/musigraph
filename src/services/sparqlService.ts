import type {
  ArtistEnrichment,
  ExternalIds,
  SearchFilters,
  SparqlBinding,
  SparqlResponse,
} from "./sparqlTypes"
import type { Lang, ProviderId } from "./providers"
import type { SourceId, SourceStatusMap } from "./sources"

// ── Shared types (exported for consumers) ─────────────────────────────────

export interface ArtistInfo {
  id: string
  name: string
  mbid?: string
  birthDate?: string
  country?: string
  genres: string[]
  instruments: string[]
  image?: string
  description?: string
  popularity?: number
  instanceTypes: string[]
  occupations: string[]
  externalIds?: ExternalIds
  /** Which source produced this row (influences, search enrichments…). */
  source?: SourceId
  /** Relation flavour when the row comes from an influence query. */
  relationType?: string
}

export interface AlbumInfo {
  id: string
  title: string
  releaseDate?: string
  label?: string
  genre?: string
  /** Localized release type label ("album", "single", "sencillo", …) */
  type?: string
  /** Source that provided the release (badge in the discography). */
  source?: SourceId
}

export interface CollaborationInfo {
  work?: string
  workType?: "song" | "album"
  collaborator: string
  collaboratorId: string
  releaseDate?: string
  source?: SourceId
}

export interface ArtistEnrichmentResult {
  enrichment?: ArtistEnrichment
  sources?: SourceStatusMap
}

export interface DiscographyOptions {
  mbid?: string
  discogsId?: string
  name?: string
  /** Force the MusicBrainz-only discography view. */
  source?: "musicbrainz"
}

// ── Request layer: in-flight dedupe + short-lived client cache ─────────────

const CLIENT_CACHE_TTL_MS = 10 * 60 * 1000
const responseCache = new Map<string, { expires: number; response: SparqlResponse }>()
const inflight = new Map<string, Promise<SparqlResponse>>()

async function callSparqlApi(
  action: string,
  params: Record<string, string | undefined>,
  provider: ProviderId,
  lang: Lang
): Promise<SparqlResponse> {
  const response = await fetch("/api/sparql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params: { ...params, provider, lang } }),
  })

  if (!response.ok) {
    const err = (await response.json().catch(() => ({ error: response.statusText }))) as {
      error?: string
    }
    throw new Error(err.error ?? `Request failed: ${response.statusText}`)
  }

  return response.json() as Promise<SparqlResponse>
}

function requestSparql(
  action: string,
  params: Record<string, string | undefined>,
  provider: ProviderId,
  lang: Lang
): Promise<SparqlResponse> {
  const key = `${provider}:${lang}:${action}:${JSON.stringify(params)}`

  const cached = responseCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return Promise.resolve(cached.response)
  }

  const pending = inflight.get(key)
  if (pending) return pending

  const promise = callSparqlApi(action, params, provider, lang).then(
    (response) => {
      inflight.delete(key)
      responseCache.set(key, { expires: Date.now() + CLIENT_CACHE_TTL_MS, response })
      return response
    },
    (error: unknown) => {
      inflight.delete(key)
      throw error
    }
  )
  inflight.set(key, promise)
  return promise
}

// ── Result processing ──────────────────────────────────────────────────────

const BAND_TYPE_QID = "Q215380"
const HUMAN_TYPE_QID = "Q5"
const COMPOSER_OCCUPATION_QID = "Q36834"
const MUSIC_OCCUPATION_QIDS = new Set([
  "Q639669", // musician
  "Q36834", // composer
  "Q177220", // singer
  "Q855091", // guitarist
  "Q486748", // pianist
  "Q386854", // drummer
  "Q130857", // DJ
  "Q183945", // record producer
  "Q158852", // conductor
  "Q753110", // songwriter
  "Q2252262", // rapper
])

function lastPathSegment(uri: string): string {
  return uri.split("/").pop() ?? ""
}

function readExternalIds(binding: SparqlBinding): ExternalIds | undefined {
  const ids: ExternalIds = {}
  if (binding.mbid?.value) ids.musicbrainz = binding.mbid.value
  if (binding.discogsId?.value) ids.discogs = binding.discogsId.value
  if (binding.spotifyId?.value) ids.spotify = binding.spotifyId.value
  if (binding.lastfmId?.value) ids.lastfm = binding.lastfmId.value
  if (binding.allmusicId?.value) ids.allmusic = binding.allmusicId.value
  return Object.keys(ids).length > 0 ? ids : undefined
}

function processArtistResults(
  response: SparqlResponse,
  provider: ProviderId,
  options: { searchTerm?: string; artistType?: SearchFilters["artistType"] } = {}
): ArtistInfo[] {
  const isDbpedia = provider === "dbpedia"
  const artists = new Map<string, ArtistInfo>()

  response.results.bindings.forEach((binding) => {
    const rawId = binding.artist?.value ?? ""
    if (!rawId) return

    const artistId = isDbpedia ? rawId : lastPathSegment(rawId)

    if (!artists.has(artistId)) {
      artists.set(artistId, {
        id: artistId,
        name: binding.artistLabel?.value ?? artistId,
        mbid: binding.mbid?.value,
        birthDate: binding.birthDate?.value,
        country: binding.countryLabel?.value,
        genres: [],
        instruments: [],
        image: binding.image?.value,
        description: binding.artistDescription?.value,
        popularity: binding.sitelinks?.value ? Number(binding.sitelinks.value) : undefined,
        instanceTypes: [],
        occupations: [],
        externalIds: readExternalIds(binding),
      })
    }

    const artist = artists.get(artistId)!

    // Backfill country from enrichment rows (DBpedia traits arrive after the main rows)
    if (!artist.country && binding.countryLabel?.value) {
      artist.country = binding.countryLabel.value
    }

    if (binding.genreLabel?.value && !artist.genres.includes(binding.genreLabel.value)) {
      artist.genres.push(binding.genreLabel.value)
    }

    if (
      binding.instrumentLabel?.value &&
      !artist.instruments.includes(binding.instrumentLabel.value)
    ) {
      artist.instruments.push(binding.instrumentLabel.value)
    }

    if (binding.instanceType?.value) {
      const typeId = lastPathSegment(binding.instanceType.value)
      if (typeId && !artist.instanceTypes.includes(typeId)) {
        artist.instanceTypes.push(typeId)
      }
    }

    if (binding.occupation?.value) {
      const occupationId = lastPathSegment(binding.occupation.value)
      if (occupationId && !artist.occupations.includes(occupationId)) {
        artist.occupations.push(occupationId)
      }
    }

    // Image fallbacks (first non-empty wins)
    if (!artist.image && binding.image?.value) {
      artist.image = binding.image.value
    }

    // Provenance / relation flavour (influence rows)
    if (!artist.source && binding.source?.value) {
      artist.source = binding.source.value as SourceId
    }
    if (!artist.relationType && binding.relationType?.value) {
      artist.relationType = binding.relationType.value
    }
  })

  let results = Array.from(artists.values())

  if (options.artistType) {
    results = filterByArtistType(results, options.artistType)
  }
  if (options.searchTerm) {
    results = rankSearchResults(results, options.searchTerm)
  }

  return results
}

function filterByArtistType(
  artists: ArtistInfo[],
  artistType: NonNullable<SearchFilters["artistType"]>
): ArtistInfo[] {
  return artists.filter((artist) => {
    const isBand = artist.instanceTypes.includes(BAND_TYPE_QID)
    switch (artistType) {
      case "band":
        return isBand
      case "solo":
        return artist.instanceTypes.includes(HUMAN_TYPE_QID) && !isBand
      case "composer":
        return artist.occupations.includes(COMPOSER_OCCUPATION_QID)
    }
  })
}

/**
 * Re-rank entity-search results: exact/prefix name matches first, then
 * popularity (Wikidata sitelinks), with a boost for music-related entities.
 */
function rankSearchResults(artists: ArtistInfo[], searchTerm: string): ArtistInfo[] {
  const needle = searchTerm.trim().toLowerCase()
  if (!needle) return artists

  const score = (artist: ArtistInfo): number => {
    const label = artist.name.toLowerCase()
    let value = artist.popularity ?? 0

    if (label === needle) value += 1_000_000
    else if (label.startsWith(needle)) value += 500_000
    else if (label.includes(needle)) value += 100_000

    const musicRelevant =
      artist.instanceTypes.includes(BAND_TYPE_QID) ||
      artist.occupations.some((occupation) => MUSIC_OCCUPATION_QIDS.has(occupation))
    if (musicRelevant) value += 50_000

    return value
  }

  return [...artists].sort((a, b) => score(b) - score(a))
}

function processAlbumResults(response: SparqlResponse, provider: ProviderId): AlbumInfo[] {
  const isDbpedia = provider === "dbpedia"
  const albums = new Map<string, AlbumInfo>()

  for (const binding of response.results.bindings) {
    const rawId = binding.album?.value ?? ""
    const id = isDbpedia ? rawId : lastPathSegment(rawId)
    const title = binding.albumLabel?.value ?? id
    const key = id || title
    if (!key) continue

    const existing = albums.get(key)
    if (!existing) {
      albums.set(key, {
        id,
        title,
        releaseDate: binding.releaseDate?.value,
        label: binding.labelLabel?.value,
        genre: binding.genreLabel?.value,
        type: binding.albumTypeLabel?.value,
        source: (binding.source?.value as SourceId | undefined) ?? (isDbpedia ? "dbpedia" : undefined),
      })
      continue
    }

    // Merge duplicate rows of the same release: an album can carry several
    // labels/genres, which would otherwise repeat with the same React key.
    if (!existing.releaseDate && binding.releaseDate?.value) {
      existing.releaseDate = binding.releaseDate.value
    }
    if (!existing.label && binding.labelLabel?.value) {
      existing.label = binding.labelLabel.value
    }
    if (!existing.genre && binding.genreLabel?.value) {
      existing.genre = binding.genreLabel.value
    }
    if (!existing.type && binding.albumTypeLabel?.value) {
      existing.type = binding.albumTypeLabel.value
    }
    if (!existing.source && binding.source?.value) {
      existing.source = binding.source.value as SourceId
    }
  }

  return [...albums.values()]
}

function processCollaborationResults(response: SparqlResponse): CollaborationInfo[] {
  const seen = new Set<string>()
  const collaborations: CollaborationInfo[] = []

  for (const binding of response.results.bindings) {
    const workId = binding.work?.value ?? ""
    const collaboratorId = binding.collaborator?.value ?? ""
    if (!collaboratorId) continue

    // MusicBrainz collaboration relations have no work: key them by relation.
    const key = `${workId || "relation"}|${collaboratorId}`
    if (seen.has(key)) continue
    seen.add(key)

    const workType = binding.workType?.value
    collaborations.push({
      work: workId ? binding.workLabel?.value ?? lastPathSegment(workId) : undefined,
      workType: workType === "album" ? "album" : workType === "song" ? "song" : undefined,
      collaborator: binding.collaboratorLabel?.value ?? lastPathSegment(collaboratorId),
      collaboratorId,
      releaseDate: binding.releaseDate?.value,
      source: binding.source?.value as SourceId | undefined,
    })
  }

  return collaborations
}

// ── Public service API ─────────────────────────────────────────────────────

class SparqlService {
  async searchArtist(
    name: string,
    filters: SearchFilters = {},
    provider: ProviderId = "wikidata",
    lang: Lang = "es"
  ): Promise<ArtistInfo[]> {
    const response = await requestSparql(
      "searchArtist",
      {
        name,
        genre: filters.genre,
        decade: filters.decade,
      },
      provider,
      lang
    )

    return processArtistResults(response, provider, {
      searchTerm: name,
      // DBpedia results do not carry instance/occupation data to filter on.
      artistType: provider === "dbpedia" ? undefined : filters.artistType,
    })
  }

  async getArtistDiscography(
    artistId: string,
    options: DiscographyOptions = {},
    provider: ProviderId = "wikidata",
    lang: Lang = "es"
  ): Promise<AlbumInfo[]> {
    const response = await requestSparql(
      "getArtistDiscography",
      {
        artistId,
        mbid: options.mbid,
        discogsId: options.discogsId,
        name: options.name,
        source: options.source,
      },
      provider,
      lang
    )
    return processAlbumResults(response, provider)
  }

  async getArtistInfluences(
    artistId: string,
    provider: ProviderId = "wikidata",
    lang: Lang = "es",
    mbid?: string
  ): Promise<ArtistInfo[]> {
    const response = await requestSparql("getArtistInfluences", { artistId, mbid }, provider, lang)
    return processArtistResults(response, provider)
  }

  async getCollaborations(
    artistId: string,
    provider: ProviderId = "wikidata",
    lang: Lang = "es",
    mbid?: string
  ): Promise<CollaborationInfo[]> {
    const response = await requestSparql("getCollaborations", { artistId, mbid }, provider, lang)
    return processCollaborationResults(response)
  }

  async getArtistEnrichment(
    artistId: string,
    provider: ProviderId = "auto",
    lang: Lang = "es",
    options: { mbid?: string } = {}
  ): Promise<ArtistEnrichmentResult> {
    const response = await requestSparql(
      "getArtistEnrichment",
      { artistId, mbid: options.mbid },
      provider,
      lang
    )
    return { enrichment: response.enrichment, sources: response.sources }
  }

  async searchByGenre(
    genreId: string,
    provider: ProviderId = "wikidata",
    lang: Lang = "es"
  ): Promise<ArtistInfo[]> {
    const response = await requestSparql("searchByGenre", { genreId }, provider, lang)
    return processArtistResults(response, provider)
  }

  async getPopularArtists(provider: ProviderId = "wikidata", lang: Lang = "es"): Promise<ArtistInfo[]> {
    return this.getTopBands(provider, lang)
  }

  async getTopBands(provider: ProviderId = "wikidata", lang: Lang = "es"): Promise<ArtistInfo[]> {
    const response = await requestSparql("getTopBands", {}, provider, lang)
    return processArtistResults(response, provider)
  }

  async searchArtistFlexible(name: string): Promise<ArtistInfo[]> {
    return this.searchArtist(name)
  }
}

export const sparqlService = new SparqlService()
