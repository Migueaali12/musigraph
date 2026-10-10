import { TtlCache } from "../serverCache"

// ── MusicBrainz REST (server-only) ─────────────────────────────────────────
// One artist lookup (genres/tags/relations) plus three browse pages (albums,
// singles, EPs) per artist. MusicBrainz allows 1 request/second — every call
// goes through a spacing queue, plus a 24 h cache. Never on the critical path:
// callers treat failures as a degraded source.
//
// Note: the artist lookup `inc=release-groups` is capped at 25 items by MB,
// so release groups are browsed instead (the browse endpoint paginates).

export interface MusicBrainzReleaseGroup {
  id: string
  title: string
  primaryType?: string
  secondaryTypes: string[]
  firstReleaseDate?: string
}

export interface MusicBrainzRelation {
  type: string
  direction?: string
  artist: { id: string; name: string }
  attributes: string[]
}

export interface MusicBrainzCore {
  id: string
  name: string
  type?: string
  genres: string[]
  tags: string[]
  relations: MusicBrainzRelation[]
}

export interface MusicBrainzArtist extends MusicBrainzCore {
  releaseGroups: MusicBrainzReleaseGroup[]
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const coreCache = new TtlCache<MusicBrainzCore>(500, CACHE_TTL_MS)
const artistCache = new TtlCache<MusicBrainzArtist>(500, CACHE_TTL_MS)
const USER_AGENT = "MusiGraph/1.0 (https://musigraph.app)"
const RELEASE_GROUP_PAGE_LIMIT = 100
const RELEASE_GROUP_TYPES = ["album", "single", "ep"] as const

// Rate limiter: space requests ~1.1 s apart (per server instance).
let nextSlot = 0
async function waitForSlot(): Promise<void> {
  const now = Date.now()
  const wait = Math.max(0, nextSlot - now)
  nextSlot = Math.max(now, nextSlot) + 1_100
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
}

async function mbFetch<T>(path: string): Promise<T> {
  await waitForSlot()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8_000)

  try {
    const res = await fetch(`https://musicbrainz.org/ws/2/${path}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`)
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("MusicBrainz timed out")
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

interface RawRelation {
  type?: string
  direction?: string
  artist?: { id?: string; name?: string }
  attributes?: string[]
}

interface RawReleaseGroup {
  id?: string
  title?: string
  "primary-type"?: string
  "secondary-types"?: string[]
  "first-release-date"?: string
}

interface RawArtist {
  id?: string
  name?: string
  type?: string
  genres?: { name?: string }[]
  tags?: { name?: string }[]
  relations?: RawRelation[]
}

interface RawReleaseGroupPage {
  "release-groups"?: RawReleaseGroup[]
}

function parseReleaseGroup(rg: RawReleaseGroup): MusicBrainzReleaseGroup | null {
  if (!rg.id || !rg.title) return null
  return {
    id: rg.id,
    title: rg.title,
    primaryType: rg["primary-type"],
    secondaryTypes: rg["secondary-types"] ?? [],
    firstReleaseDate: rg["first-release-date"],
  }
}

async function fetchReleaseGroupPage(
  mbid: string,
  type: (typeof RELEASE_GROUP_TYPES)[number]
): Promise<MusicBrainzReleaseGroup[]> {
  const data = await mbFetch<RawReleaseGroupPage>(
    `release-group?artist=${mbid}&type=${type}&limit=${RELEASE_GROUP_PAGE_LIMIT}&fmt=json`
  )
  return (data["release-groups"] ?? [])
    .map(parseReleaseGroup)
    .filter((rg): rg is MusicBrainzReleaseGroup => Boolean(rg))
}

export async function getMusicBrainzArtistCore(mbid: string): Promise<MusicBrainzCore> {
  const cached = coreCache.get(mbid)
  if (cached) return cached

  const artistData = await mbFetch<RawArtist>(
    `artist/${mbid}?inc=genres+tags+artist-rels&fmt=json`
  )

  const core: MusicBrainzCore = {
    id: artistData.id ?? mbid,
    name: artistData.name ?? "",
    type: artistData.type,
    genres: (artistData.genres ?? [])
      .map((genre) => genre.name)
      .filter((name): name is string => Boolean(name)),
    tags: (artistData.tags ?? [])
      .map((tag) => tag.name)
      .filter((name): name is string => Boolean(name)),
    relations: (artistData.relations ?? [])
      .filter((rel) => Boolean(rel.type && rel.artist?.id && rel.artist?.name))
      .map((rel) => ({
        type: rel.type as string,
        direction: rel.direction,
        artist: { id: rel.artist!.id as string, name: rel.artist!.name as string },
        attributes: rel.attributes ?? [],
      })),
  }

  coreCache.set(mbid, core)
  return core
}

export async function getMusicBrainzArtist(mbid: string): Promise<MusicBrainzArtist> {
  const cached = artistCache.get(mbid)
  if (cached) return cached

  const start = Date.now()

  // Core + three browse pages, spaced ~1.1 s apart by the rate-limit queue.
  const [core, ...releaseGroupPages] = await Promise.all([
    getMusicBrainzArtistCore(mbid),
    ...RELEASE_GROUP_TYPES.map((type) => fetchReleaseGroupPage(mbid, type)),
  ])

  const artist: MusicBrainzArtist = {
    ...core,
    releaseGroups: releaseGroupPages.flat(),
  }

  artistCache.set(mbid, artist)
  console.log(
    `[enrichment] musicbrainz ${mbid} in ${Date.now() - start} ms (${artist.releaseGroups.length} release groups, ${artist.relations.length} relations)`
  )
  return artist
}
