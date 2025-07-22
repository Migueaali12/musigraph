import type { AlbumInfo, CollaborationInfo, ArtistInfo } from "./sparqlService"

/**
 * Obtiene la discografía de un artista desde MusicBrainz usando su MBID.
 * Devuelve un array de AlbumInfo.
 */
export async function fetchDiscographyFromMusicBrainz(
  mbid: string
): Promise<AlbumInfo[]> {
  const url = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=release-groups&fmt=json`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`)
  const data = await res.json()
  // release-groups contiene los álbumes principales
  const releaseGroups = (data["release-groups"] || []) as Record<
    string,
    unknown
  >[]
  return releaseGroups
    .filter((rg) => (rg["primary-type"] as string) === "Album")
    .map((rg) => ({
      id: rg["id"] as string,
      title: rg["title"] as string,
      releaseDate: rg["first-release-date"] as string,
      label: undefined,
      genre: undefined,
    }))
}

/**
 * Obtiene las colaboraciones de un artista desde MusicBrainz usando su MBID.
 * Devuelve un array de CollaborationInfo.
 */
export async function fetchCollaborationsFromMusicBrainz(
  mbid: string
): Promise<CollaborationInfo[]> {
  const url = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=artist-rels+recording-rels+release-rels&fmt=json`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`)
  const data = await res.json()
  const collaborations: CollaborationInfo[] = []
  // Buscar relaciones de tipo "collaboration" o "performance"
  if (Array.isArray(data.relations)) {
    ;(data.relations as Record<string, unknown>[]).forEach((rel) => {
      if (
        typeof rel.type === "string" &&
        (rel.type.toLowerCase().includes("collaboration") ||
          rel.type.toLowerCase().includes("performance")) &&
        rel.artist &&
        typeof (rel.artist as Record<string, unknown>).name === "string"
      ) {
        collaborations.push({
          song:
            ((rel.recording as Record<string, unknown>)?.title as string) ||
            "Colaboración",
          artist1: data.name as string,
          artist2: (rel.artist as Record<string, unknown>).name as string,
          releaseDate: (rel.begin as string) || undefined,
        })
      }
    })
  }
  return collaborations
}

/**
 * Obtiene las influencias de un artista desde MusicBrainz usando su MBID.
 * Devuelve un array de ArtistInfo (solo nombre y MBID).
 */
export async function fetchInfluencesFromMusicBrainz(
  mbid: string
): Promise<ArtistInfo[]> {
  const url = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=artist-rels&fmt=json`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`)
  const data = await res.json()
  const influences: ArtistInfo[] = []
  if (Array.isArray(data.relations)) {
    ;(data.relations as Record<string, unknown>[]).forEach((rel) => {
      if (
        typeof rel.type === "string" &&
        (rel.type.toLowerCase().includes("influenced by") ||
          rel.type.toLowerCase().includes("influence")) &&
        rel.artist &&
        typeof (rel.artist as Record<string, unknown>).name === "string"
      ) {
        influences.push({
          id: (rel.artist as Record<string, unknown>).id as string,
          name: (rel.artist as Record<string, unknown>).name as string,
          mbid: (rel.artist as Record<string, unknown>).id as string,
          genres: [],
          instruments: [],
        })
      }
    })
  }
  return influences
}

/**
 * Helper avanzado: Busca colaboraciones recorriendo los primeros N releases principales del artista en MusicBrainz.
 * Limita a los primeros 3 releases para evitar demasiadas llamadas.
 */
export async function fetchDeepCollaborationsFromMusicBrainz(
  mbid: string,
  maxReleases: number = 3
): Promise<CollaborationInfo[]> {
  const url = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=release-groups+releases&fmt=json`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`)
  const data = await res.json()
  const releases = (data.releases || []) as Record<string, unknown>[]
  const selectedReleases = releases.slice(0, maxReleases)
  const collaborations: CollaborationInfo[] = []

  for (const release of selectedReleases) {
    const releaseId = release.id as string
    if (!releaseId) continue
    try {
      const relRes = await fetch(
        `https://musicbrainz.org/ws/2/release/${releaseId}?inc=recordings+recording-level-rels+artist-rels&fmt=json`,
        {
          headers: {
            "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
            Accept: "application/json",
          },
        }
      )
      if (!relRes.ok) continue
      const relData = await relRes.json()
      // artist-rels a nivel release
      if (Array.isArray(relData["artist-rels"])) {
        ;(relData["artist-rels"] as Record<string, unknown>[]).forEach(
          (rel) => {
            if (
              rel.artist &&
              typeof (rel.artist as Record<string, unknown>).name === "string"
            ) {
              collaborations.push({
                song: (relData.title as string) || "Colaboración",
                artist1:
                  (data.title as string) || (data.name as string) || "Artista",
                artist2: (rel.artist as Record<string, unknown>).name as string,
                releaseDate: (relData.date as string) || undefined,
              })
            }
          }
        )
      }
      // recording-level-rels a nivel de cada grabación
      if (Array.isArray(relData["media"])) {
        ;(relData["media"] as Record<string, unknown>[]).forEach((media) => {
          if (Array.isArray(media.tracks)) {
            ;(media.tracks as Record<string, unknown>[]).forEach((track) => {
              if (Array.isArray(track["recording-level-rels"])) {
                ;(
                  track["recording-level-rels"] as Record<string, unknown>[]
                ).forEach((rel) => {
                  if (
                    rel.artist &&
                    typeof (rel.artist as Record<string, unknown>).name ===
                      "string"
                  ) {
                    collaborations.push({
                      song: (track.title as string) || "Colaboración",
                      artist1:
                        (data.title as string) ||
                        (data.name as string) ||
                        "Artista",
                      artist2: (rel.artist as Record<string, unknown>)
                        .name as string,
                      releaseDate: (relData.date as string) || undefined,
                    })
                  }
                })
              }
            })
          }
        })
      }
    } catch (err) {
      // Ignorar errores individuales de release
      continue
    }
  }
  return collaborations
}

/**
 * Helper avanzado: Busca influencias recorriendo los primeros N releases principales del artista en MusicBrainz.
 * Busca relaciones de tipo "influenced by" en artist-rels de cada release.
 */
export async function fetchDeepInfluencesFromMusicBrainz(
  mbid: string,
  maxReleases: number = 3
): Promise<ArtistInfo[]> {
  const url = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=release-groups+releases&fmt=json`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`)
  const data = await res.json()
  const releases = (data.releases || []) as Record<string, unknown>[]
  const selectedReleases = releases.slice(0, maxReleases)
  const influences: ArtistInfo[] = []

  for (const release of selectedReleases) {
    const releaseId = release.id as string
    if (!releaseId) continue
    try {
      const relRes = await fetch(
        `https://musicbrainz.org/ws/2/release/${releaseId}?inc=artist-rels&fmt=json`,
        {
          headers: {
            "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
            Accept: "application/json",
          },
        }
      )
      if (!relRes.ok) continue
      const relData = await relRes.json()
      if (Array.isArray(relData["artist-rels"])) {
        ;(relData["artist-rels"] as Record<string, unknown>[]).forEach(
          (rel) => {
            if (
              typeof rel.type === "string" &&
              rel.type.toLowerCase().includes("influenc") &&
              rel.artist &&
              typeof (rel.artist as Record<string, unknown>).name === "string"
            ) {
              influences.push({
                id: (rel.artist as Record<string, unknown>).id as string,
                name: (rel.artist as Record<string, unknown>).name as string,
                mbid: (rel.artist as Record<string, unknown>).id as string,
                genres: [],
                instruments: [],
              })
            }
          }
        )
      }
    } catch (err) {
      continue
    }
  }
  return influences
}
