import { TtlCache } from "../serverCache"

// ── Discogs API (server-only, feature-flagged) ─────────────────────────────
// Requires DISCOGS_TOKEN (personal access token). When the variable is not
// configured the whole source disables itself and the orchestrator reports
// `discogs: "skipped"`. Authenticated rate limit: 60 req/min — the 24 h cache
// keeps the request volume tiny.

export interface DiscogsRelease {
  id: string
  title: string
  year?: number
  label?: string
  format?: string
  url: string
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const releasesCache = new TtlCache<DiscogsRelease[]>(300, CACHE_TTL_MS)
const artistIdCache = new TtlCache<string | null>(300, CACHE_TTL_MS)
const USER_AGENT = "MusiGraph/1.0 (+https://musigraph.app)"

export function isDiscogsEnabled(): boolean {
  return Boolean(process.env.DISCOGS_TOKEN)
}

async function discogsFetch<T>(path: string): Promise<T> {
  const token = process.env.DISCOGS_TOKEN
  if (!token) throw new Error("Discogs token not configured")

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8_000)

  try {
    const res = await fetch(`https://api.discogs.com${path}`, {
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Discogs error: ${res.status}`)
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Discogs timed out")
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

interface DiscogsApiRelease {
  id?: number
  title?: string
  year?: number
  label?: string
  format?: string
  role?: string
  type?: string
}

export async function getDiscogsArtistReleases(artistId: string): Promise<DiscogsRelease[]> {
  const cached = releasesCache.get(artistId)
  if (cached) return cached

  const data = await discogsFetch<{ releases?: DiscogsApiRelease[] }>(
    `/artists/${artistId}/releases?per_page=100&sort=year&sort_order=asc`
  )

  const releases: DiscogsRelease[] = (data.releases ?? [])
    .filter((release) => release.role === "Main" && release.id && release.title)
    .map((release) => ({
      id: String(release.id),
      title: release.title as string,
      year: release.year,
      label: release.label,
      format: release.format?.split(",")[0]?.trim(),
      url:
        release.type === "master"
          ? `https://www.discogs.com/master/${release.id}`
          : `https://www.discogs.com/release/${release.id}`,
    }))

  releasesCache.set(artistId, releases)
  console.log(`[enrichment] discogs artist ${artistId}: ${releases.length} main releases`)
  return releases
}

/** Fallback used when the artist has no P1953: search by name. */
export async function searchDiscogsArtistId(name: string): Promise<string | null> {
  const cached = artistIdCache.get(name)
  if (cached !== undefined) return cached

  const data = await discogsFetch<{
    results?: { id?: number; title?: string; type?: string }[]
  }>(`/database/search?q=${encodeURIComponent(name)}&type=artist&per_page=5`)

  const results = (data.results ?? []).filter(
    (result) => result.type === "artist" && result.id
  )
  const normalized = name.trim().toLowerCase()
  const exact = results.find(
    (result) => (result.title ?? "").replace(/\s*\(\d+\)$/, "").trim().toLowerCase() === normalized
  )
  const match = exact ?? results[0]
  const id = match?.id ? String(match.id) : null

  artistIdCache.set(name, id)
  return id
}
