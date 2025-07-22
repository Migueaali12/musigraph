import type { ArtistInfo, AlbumInfo, CollaborationInfo } from "./sparqlService"

interface ProcessedArtistData {
  basic: ArtistInfo
  discography: AlbumInfo[]
  influences: ArtistInfo[]
  collaborations: CollaborationInfo[]
  statistics: {
    totalAlbums: number
    totalInfluences: number
    totalCollaborations: number
    activeYears: number
  }
}

interface NetworkNode {
  id: string
  label: string
  type: "artist" | "album" | "genre"
  data: any
}

interface NetworkEdge {
  source: string
  target: string
  type: "influence" | "collaboration" | "genre"
  weight: number
}

interface NetworkData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

class DataProcessor {
  processArtistData(
    artist: ArtistInfo,
    discography: AlbumInfo[],
    influences: ArtistInfo[],
    collaborations: CollaborationInfo[]
  ): ProcessedArtistData {
    const statistics = this.calculateArtistStatistics(
      artist,
      discography,
      influences,
      collaborations
    )

    return {
      basic: artist,
      discography: this.sortAlbumsByDate(discography),
      influences: this.sortArtistsByInfluence(influences),
      collaborations: this.sortCollaborationsByDate(collaborations),
      statistics,
    }
  }

  private calculateArtistStatistics(
    artist: ArtistInfo,
    discography: AlbumInfo[],
    influences: ArtistInfo[],
    collaborations: CollaborationInfo[]
  ) {
    const birthYear = artist.birthDate
      ? new Date(artist.birthDate).getFullYear()
      : null
    const currentYear = new Date().getFullYear()
    const activeYears = birthYear ? currentYear - birthYear : 0

    return {
      totalAlbums: discography.length,
      totalInfluences: influences.length,
      totalCollaborations: collaborations.length,
      activeYears: Math.max(0, activeYears),
    }
  }

  private sortAlbumsByDate(albums: AlbumInfo[]): AlbumInfo[] {
    return albums.sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0
      return dateB - dateA // Most recent first
    })
  }

  private sortArtistsByInfluence(artists: ArtistInfo[]): ArtistInfo[] {
    // Sort by number of genres (more diverse = more influential)
    return artists.sort((a, b) => b.genres.length - a.genres.length)
  }

  private sortCollaborationsByDate(
    collaborations: CollaborationInfo[]
  ): CollaborationInfo[] {
    return collaborations.sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0
      return dateB - dateA // Most recent first
    })
  }

  buildInfluenceNetwork(
    artist: ArtistInfo,
    influences: ArtistInfo[]
  ): NetworkData {
    const nodes: NetworkNode[] = [
      {
        id: artist.id,
        label: artist.name,
        type: "artist",
        data: artist,
      },
    ]

    const edges: NetworkEdge[] = []

    influences.forEach((influence) => {
      nodes.push({
        id: influence.id,
        label: influence.name,
        type: "artist",
        data: influence,
      })

      edges.push({
        source: artist.id,
        target: influence.id,
        type: "influence",
        weight: influence.genres.length, // Weight based on genre diversity
      })
    })

    return { nodes, edges }
  }

  buildCollaborationNetwork(
    artist: ArtistInfo,
    collaborations: CollaborationInfo[]
  ): NetworkData {
    const nodes: NetworkNode[] = [
      {
        id: artist.id,
        label: artist.name,
        type: "artist",
        data: artist,
      },
    ]

    const edges: NetworkEdge[] = []
    const collaboratorMap = new Map<string, { name: string; count: number }>()

    collaborations.forEach((collab) => {
      const collaboratorId = collab.artist2
      const collaboratorName = collab.artist2

      if (!collaboratorMap.has(collaboratorId)) {
        collaboratorMap.set(collaboratorId, {
          name: collaboratorName,
          count: 0,
        })
        nodes.push({
          id: collaboratorId,
          label: collaboratorName,
          type: "artist",
          data: { name: collaboratorName },
        })
      }

      const collaborator = collaboratorMap.get(collaboratorId)!
      collaborator.count++

      edges.push({
        source: artist.id,
        target: collaboratorId,
        type: "collaboration",
        weight: 1,
      })
    })

    // Update edge weights based on collaboration frequency
    edges.forEach((edge) => {
      const collaborator = collaboratorMap.get(edge.target)
      if (collaborator) {
        edge.weight = collaborator.count
      }
    })

    return { nodes, edges }
  }

  buildGenreTimeline(
    albums: AlbumInfo[]
  ): Array<{ year: number; count: number; genres: string[] }> {
    const timeline = new Map<number, { count: number; genres: Set<string> }>()

    albums.forEach((album) => {
      if (album.releaseDate) {
        const year = new Date(album.releaseDate).getFullYear()
        const current = timeline.get(year) || { count: 0, genres: new Set() }

        current.count++
        if (album.genre) {
          current.genres.add(album.genre)
        }

        timeline.set(year, current)
      }
    })

    return Array.from(timeline.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, data]) => ({
        year,
        count: data.count,
        genres: Array.from(data.genres),
      }))
  }

  processGeographicData(
    artists: ArtistInfo[]
  ): Array<{ country: string; count: number; artists: string[] }> {
    const countryMap = new Map<string, { count: number; artists: string[] }>()

    artists.forEach((artist) => {
      if (artist.country) {
        const current = countryMap.get(artist.country) || {
          count: 0,
          artists: [],
        }
        current.count++
        current.artists.push(artist.name)
        countryMap.set(artist.country, current)
      }
    })

    return Array.from(countryMap.entries())
      .map(([country, data]) => ({
        country,
        count: data.count,
        artists: data.artists,
      }))
      .sort((a, b) => b.count - a.count)
  }

  extractGenres(
    artists: ArtistInfo[]
  ): Array<{ genre: string; count: number; artists: string[] }> {
    const genreMap = new Map<string, { count: number; artists: string[] }>()

    artists.forEach((artist) => {
      artist.genres.forEach((genre) => {
        const current = genreMap.get(genre) || { count: 0, artists: [] }
        current.count++
        if (!current.artists.includes(artist.name)) {
          current.artists.push(artist.name)
        }
        genreMap.set(genre, current)
      })
    })

    return Array.from(genreMap.entries())
      .map(([genre, data]) => ({
        genre,
        count: data.count,
        artists: data.artists,
      }))
      .sort((a, b) => b.count - a.count)
  }

  calculateSimilarity(artist1: ArtistInfo, artist2: ArtistInfo): number {
    let similarity = 0

    // Genre similarity
    const genreIntersection = artist1.genres.filter((g) =>
      artist2.genres.includes(g)
    )
    const genreUnion = new Set([...artist1.genres, ...artist2.genres])
    const genreSimilarity = genreIntersection.length / genreUnion.size

    // Instrument similarity
    const instrumentIntersection = artist1.instruments.filter((i) =>
      artist2.instruments.includes(i)
    )
    const instrumentUnion = new Set([
      ...artist1.instruments,
      ...artist2.instruments,
    ])
    const instrumentSimilarity =
      instrumentUnion.size > 0
        ? instrumentIntersection.length / instrumentUnion.size
        : 0

    // Country similarity
    const countrySimilarity = artist1.country === artist2.country ? 1 : 0

    // Weighted average
    similarity =
      genreSimilarity * 0.5 +
      instrumentSimilarity * 0.3 +
      countrySimilarity * 0.2

    return similarity
  }

  findSimilarArtists(
    targetArtist: ArtistInfo,
    allArtists: ArtistInfo[],
    limit: number = 10
  ): ArtistInfo[] {
    return allArtists
      .filter((artist) => artist.id !== targetArtist.id)
      .map((artist) => ({
        ...artist,
        similarity: this.calculateSimilarity(targetArtist, artist),
      }))
      .sort((a, b) => (b as any).similarity - (a as any).similarity)
      .slice(0, limit)
      .map((artist) => {
        const { similarity, ...artistData } = artist as any
        return artistData
      })
  }
}

export const dataProcessor = new DataProcessor()
export type { ProcessedArtistData, NetworkData, NetworkNode, NetworkEdge }
