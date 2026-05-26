import { fetchDiscographyFromMusicBrainz } from "./musicbrainzService"
import type { SearchFilters } from "@/components/search/SearchBar"

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
}

export interface AlbumInfo {
  id: string
  title: string
  releaseDate?: string
  label?: string
  genre?: string
}

export interface CollaborationInfo {
  song: string
  artist1: string
  artist2: string
  releaseDate?: string
}

interface SparqlBinding {
  [key: string]: { value: string; type: string }
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] }
}

// ── Internal helpers ───────────────────────────────────────────────────────

async function callSparqlApi(
  action: string,
  params: Record<string, string | undefined>
): Promise<SparqlResponse> {
  const response = await fetch("/api/sparql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
  })

  if (!response.ok) {
    const err = (await response.json().catch(() => ({ error: response.statusText }))) as {
      error?: string
    }
    throw new Error(err.error ?? `Request failed: ${response.statusText}`)
  }

  return response.json() as Promise<SparqlResponse>
}

function processArtistResults(
  response: SparqlResponse,
  isDbpedia = false
): ArtistInfo[] {
  const artists = new Map<string, ArtistInfo>()

  response.results.bindings.forEach((binding) => {
    const artistId = isDbpedia
      ? (binding.artist?.value ?? "")
      : (binding.artist?.value.split("/").pop() ?? "")

    if (!artists.has(artistId)) {
      artists.set(artistId, {
        id: artistId,
        name: binding.artistLabel?.value ?? "",
        mbid: binding.mbid?.value,
        birthDate: binding.birthDate?.value,
        country: binding.countryLabel?.value,
        genres: [],
        instruments: [],
        image: binding.image?.value,
      })
    }

    const artist = artists.get(artistId)!

    if (
      binding.genreLabel?.value &&
      !artist.genres.includes(binding.genreLabel.value)
    ) {
      artist.genres.push(binding.genreLabel.value)
    }

    if (
      binding.instrumentLabel?.value &&
      !artist.instruments.includes(binding.instrumentLabel.value)
    ) {
      artist.instruments.push(binding.instrumentLabel.value)
    }
  })

  return Array.from(artists.values())
}

function processAlbumResults(
  response: SparqlResponse,
  isDbpedia = false
): AlbumInfo[] {
  return response.results.bindings.map((binding) => ({
    id: isDbpedia
      ? (binding.album?.value ?? "")
      : (binding.album?.value?.split("/").pop() ?? ""),
    title: binding.albumLabel?.value ?? "Sin título",
    releaseDate: binding.releaseDate?.value,
    label: binding.labelLabel?.value,
    genre: binding.genreLabel?.value,
  }))
}

function processCollaborationResults(
  response: SparqlResponse
): CollaborationInfo[] {
  return response.results.bindings.map((binding) => ({
    song: binding.songLabel?.value ?? "Sin título",
    artist1: "",
    artist2: binding.collaboratorLabel?.value ?? "Colaborador desconocido",
    releaseDate: binding.releaseDate?.value,
  }))
}

// ── Public service API ─────────────────────────────────────────────────────

class SparqlService {
  async searchArtist(
    name: string,
    filters: SearchFilters = {},
    endpoint?: string
  ): Promise<ArtistInfo[]> {
    const isDbpedia = endpoint?.includes("dbpedia") ?? false
    const response = await callSparqlApi("searchArtist", {
      name,
      genre: filters.genre,
      decade: filters.decade,
      artistType: filters.artistType,
      endpoint: endpoint ?? "",
    })
    return processArtistResults(response, isDbpedia)
  }

  async getArtistDiscography(
    artistId: string,
    mbid?: string,
    endpoint?: string
  ): Promise<AlbumInfo[]> {
    const isDbpedia = endpoint?.includes("dbpedia") ?? false
    const response = await callSparqlApi("getArtistDiscography", {
      artistId,
      endpoint: endpoint ?? "",
    })
    const albums = processAlbumResults(response, isDbpedia)

    // Fallback to MusicBrainz when Wikidata returns nothing and mbid is known
    if (albums.length === 0 && mbid && !isDbpedia) {
      try {
        return await fetchDiscographyFromMusicBrainz(mbid)
      } catch {
        // MusicBrainz unavailable — return empty
      }
    }

    return albums
  }

  async getArtistInfluences(
    artistId: string,
    endpoint?: string
  ): Promise<ArtistInfo[]> {
    const isDbpedia = endpoint?.includes("dbpedia") ?? false
    const response = await callSparqlApi("getArtistInfluences", {
      artistId,
      endpoint: endpoint ?? "",
    })
    return processArtistResults(response, isDbpedia)
  }

  async getCollaborations(
    artistId: string,
    endpoint?: string
  ): Promise<CollaborationInfo[]> {
    const response = await callSparqlApi("getCollaborations", {
      artistId,
      endpoint: endpoint ?? "",
    })
    return processCollaborationResults(response)
  }

  async searchByGenre(genreId: string): Promise<ArtistInfo[]> {
    const response = await callSparqlApi("searchByGenre", { genreId })
    return processArtistResults(response)
  }

  async getPopularArtists(): Promise<ArtistInfo[]> {
    return this.getTopBands()
  }

  async getTopBands(): Promise<ArtistInfo[]> {
    const response = await callSparqlApi("getTopBands", {})
    return processArtistResults(response)
  }

  async searchArtistFlexible(name: string): Promise<ArtistInfo[]> {
    return this.searchArtist(name)
  }
}

export const sparqlService = new SparqlService()
