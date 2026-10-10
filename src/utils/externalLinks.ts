import type { ExternalIds } from "@/services/sparqlTypes"

// ── External artist links (built from Wikidata identifiers) ────────────────

export interface ExternalLink {
  id: "musicbrainz" | "discogs" | "spotify" | "lastfm" | "allmusic"
  label: string
  url: string
}

export function getExternalLinks(ids?: ExternalIds): ExternalLink[] {
  if (!ids) return []

  const links: ExternalLink[] = []
  if (ids.musicbrainz) {
    links.push({
      id: "musicbrainz",
      label: "MusicBrainz",
      url: `https://musicbrainz.org/artist/${ids.musicbrainz}`,
    })
  }
  if (ids.discogs) {
    links.push({
      id: "discogs",
      label: "Discogs",
      url: `https://www.discogs.com/artist/${ids.discogs}`,
    })
  }
  if (ids.spotify) {
    links.push({
      id: "spotify",
      label: "Spotify",
      url: `https://open.spotify.com/artist/${ids.spotify}`,
    })
  }
  if (ids.lastfm) {
    links.push({
      id: "lastfm",
      label: "Last.fm",
      url: `https://www.last.fm/music/${encodeURIComponent(ids.lastfm)}`,
    })
  }
  if (ids.allmusic) {
    links.push({
      id: "allmusic",
      label: "AllMusic",
      url: `https://www.allmusic.com/artist/${ids.allmusic}`,
    })
  }
  return links
}
