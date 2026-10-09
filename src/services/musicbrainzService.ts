import type { AlbumInfo } from "./sparqlService"

/**
 * Fetch an artist discography from MusicBrainz using its MBID.
 * Used as a fallback when Wikidata/QLever returns no releases.
 *
 * MusicBrainz REST has a 1 request/second rate limit — callers should treat
 * this as an opportunistic enhancement, never as the critical path.
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
  // release-groups contains the main albums
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
      type: "album",
    }))
}
