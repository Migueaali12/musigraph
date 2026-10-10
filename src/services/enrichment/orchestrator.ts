import { PROVIDERS, type Lang, type ProviderInfo } from "../providers"
import {
  emptyResponse,
  type ArtistBio,
  type ArtistMember,
  type SearchFilters,
  type SparqlBinding,
  type SparqlResponse,
} from "../sparqlTypes"
import type { SourceId, SourceStatus, SourceStatusMap } from "../sources"
import type { QueryRunOptions } from "../sparqlExecutor"
import {
  getCollaborations,
  getDiscography,
  getInfluences,
  getTopBands,
  searchArtist,
  searchByGenre,
} from "../actions"
import { extractYear } from "@/utils/date"
import { resolveArtistData } from "./wikidataApi"
import { getWikipediaSummary } from "./wikipedia"
import { getDbpediaEsAbstract } from "./dbpediaEs"
import { getMusicBrainzArtist, getMusicBrainzArtistCore, type MusicBrainzArtist, type MusicBrainzCore } from "./musicbrainz"
import {
  getDiscogsArtistReleases,
  isDiscogsEnabled,
  searchDiscogsArtistId,
  type DiscogsRelease,
} from "./discogs"

// ── Auto orchestrator ──────────────────────────────────────────────────────
// `auto` runs the Wikidata core query (with a QLever failover) and merges the
// REST sources on top of the same binding contract the app already uses.
// The profile core is essential; every other source is an enhancement and
// reports its outcome through the `sources` provenance map.

// Tight budget so a slow WDQS still leaves room for the QLever failover
// inside the route's 30 s window.
const AUTO_PRIMARY: QueryRunOptions = { timeoutMs: 12_000, retries: 0 }
const AUTO_FALLBACK: QueryRunOptions = { timeoutMs: 8_000, retries: 0 }

const MB_RELEASE_TYPES = new Set(["Album", "Single", "EP"])

type RunWithOptions = (
  provider: ProviderInfo,
  run: QueryRunOptions
) => Promise<SparqlResponse>

function statusFromError(err: unknown): SourceStatus {
  return err instanceof Error && /timed out|abort/i.test(err.message)
    ? "timeout"
    : "error"
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function mergedSources(...maps: (SourceStatusMap | undefined)[]): SourceStatusMap {
  return Object.assign({}, ...maps.filter(Boolean)) as SourceStatusMap
}

async function runWithFailover(
  run: RunWithOptions
): Promise<{ response: SparqlResponse; sources: SourceStatusMap }> {
  try {
    const response = await run(PROVIDERS.wikidata, AUTO_PRIMARY)
    return { response, sources: { wikidata: "ok" } }
  } catch (err) {
    console.warn(`[auto] Wikidata failed (${describeError(err)}); failing over to QLever`)
    const response = await run(PROVIDERS.qlever, AUTO_FALLBACK)
    return {
      response,
      sources: { wikidata: statusFromError(err), qlever: "ok" },
    }
  }
}

async function fetchMusicBrainz(mbid?: string): Promise<MusicBrainzArtist | null> {
  return mbid ? getMusicBrainzArtist(mbid) : null
}

async function fetchMusicBrainzCore(mbid?: string): Promise<MusicBrainzCore | null> {
  return mbid ? getMusicBrainzArtistCore(mbid) : null
}

async function fetchDiscogsReleases(
  discogsId?: string,
  name?: string
): Promise<DiscogsRelease[] | null> {
  if (!isDiscogsEnabled()) return null
  let id = discogsId
  if (!id && name) {
    id = (await searchDiscogsArtistId(name)) ?? undefined
  }
  if (!id) return null
  return getDiscogsArtistReleases(id)
}

async function resolveIdentity(
  artistId: string,
  lang: Lang,
  params: { mbid?: string; discogsId?: string }
): Promise<{ mbid?: string; discogsId?: string }> {
  if (params.mbid && params.discogsId) return params
  try {
    const resolved = await resolveArtistData(artistId, lang)
    return {
      mbid: params.mbid ?? resolved.mbid,
      discogsId: params.discogsId ?? resolved.discogsId,
    }
  } catch (err) {
    console.warn(`[auto] identity resolution failed: ${describeError(err)}`)
    return { mbid: params.mbid, discogsId: params.discogsId }
  }
}

// ── Binding helpers ────────────────────────────────────────────────────────

function makeRow(entries: Record<string, string | undefined>): SparqlBinding {
  const row: SparqlBinding = {}
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === "") continue
    row[key] = value.startsWith("http")
      ? { type: "uri", value }
      : { type: "literal", value }
  }
  return row
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

// ── Auto actions ───────────────────────────────────────────────────────────

export async function autoSearchArtist(
  name: string,
  filters: SearchFilters,
  lang: Lang
): Promise<SparqlResponse> {
  const { response, sources } = await runWithFailover((provider, run) =>
    searchArtist(name, filters, provider, lang, run)
  )
  return { ...response, sources: mergedSources(response.sources, sources) }
}

export async function autoSearchByGenre(
  genreId: string,
  lang: Lang
): Promise<SparqlResponse> {
  const { response, sources } = await runWithFailover((provider, run) =>
    searchByGenre(genreId, provider, lang, run)
  )
  return { ...response, sources: mergedSources(response.sources, sources) }
}

export async function autoTopBands(lang: Lang): Promise<SparqlResponse> {
  const { response, sources } = await runWithFailover((provider, run) =>
    getTopBands(provider, lang, run)
  )
  return { ...response, sources: mergedSources(response.sources, sources) }
}

// ── Discography merge ──────────────────────────────────────────────────────

interface AlbumRecord {
  uri: string
  title: string
  date?: string
  label?: string
  genre?: string
  type?: string
  mbReleaseGroupId?: string
  source: SourceId
}

function albumRecordsFromBindings(response: SparqlResponse): AlbumRecord[] {
  return response.results.bindings
    .map((row) => ({
      uri: row.album?.value ?? "",
      title: row.albumLabel?.value ?? "",
      date: row.releaseDate?.value,
      label: row.labelLabel?.value,
      genre: row.genreLabel?.value,
      type: row.albumTypeLabel?.value,
      mbReleaseGroupId: row.mbReleaseGroupId?.value,
      source: (row.source?.value as SourceId | undefined) ?? "wikidata",
    }))
    .filter((record) => Boolean(record.uri && record.title))
}

function albumRecordsFromMusicBrainz(data: MusicBrainzArtist): AlbumRecord[] {
  return data.releaseGroups
    .filter((rg) => rg.primaryType && MB_RELEASE_TYPES.has(rg.primaryType))
    .map((rg) => ({
      uri: `https://musicbrainz.org/release-group/${rg.id}`,
      title: rg.title,
      date: rg.firstReleaseDate,
      type: rg.primaryType,
      mbReleaseGroupId: rg.id,
      source: "musicbrainz" as SourceId,
    }))
}

function albumRecordsFromDiscogs(releases: DiscogsRelease[]): AlbumRecord[] {
  return releases.map((release) => ({
    uri: release.url,
    title: release.title,
    date: release.year ? String(release.year) : undefined,
    label: release.label,
    type: release.format,
    source: "discogs" as SourceId,
  }))
}

function backfillAlbum(target: AlbumRecord, extra: AlbumRecord): void {
  if (!target.date && extra.date) target.date = extra.date
  if (!target.label && extra.label) target.label = extra.label
  if (!target.genre && extra.genre) target.genre = extra.genre
  if (!target.type && extra.type) target.type = extra.type
  if (!target.mbReleaseGroupId && extra.mbReleaseGroupId) {
    target.mbReleaseGroupId = extra.mbReleaseGroupId
  }
}

/**
 * Dedupe releases across sources. MusicBrainz ids (Wikidata P436 ↔ MB release
 * group) are the strong key; otherwise normalized title + year.
 */
function mergeAlbumRecords(...groups: AlbumRecord[][]): AlbumRecord[] {
  const byMbId = new Map<string, AlbumRecord>()
  const byTitle = new Map<string, AlbumRecord>()
  const merged: AlbumRecord[] = []

  const add = (record: AlbumRecord) => {
    const titleKey = `t:${normalizeText(record.title)}|${extractYear(record.date) ?? ""}`
    const existing =
      (record.mbReleaseGroupId ? byMbId.get(record.mbReleaseGroupId) : undefined) ??
      byTitle.get(titleKey)

    if (existing) {
      backfillAlbum(existing, record)
      if (existing.mbReleaseGroupId) byMbId.set(existing.mbReleaseGroupId, existing)
      byTitle.set(titleKey, existing)
      return
    }

    const entry = { ...record }
    merged.push(entry)
    if (entry.mbReleaseGroupId) byMbId.set(entry.mbReleaseGroupId, entry)
    byTitle.set(titleKey, entry)
  }

  for (const group of groups) {
    for (const record of group) add(record)
  }

  return merged.sort((a, b) => (extractYear(a.date) ?? 0) - (extractYear(b.date) ?? 0))
}

function albumBindings(records: AlbumRecord[]): SparqlBinding[] {
  return records.map((record) =>
    makeRow({
      album: record.uri,
      albumLabel: record.title,
      releaseDate: record.date,
      labelLabel: record.label,
      genreLabel: record.genre,
      albumTypeLabel: record.type,
      mbReleaseGroupId: record.mbReleaseGroupId,
      source: record.source,
    })
  )
}

export interface AutoDiscographyParams {
  mbid?: string
  discogsId?: string
  name?: string
}

export async function autoDiscography(
  artistId: string,
  lang: Lang,
  params: AutoDiscographyParams = {}
): Promise<SparqlResponse> {
  // Wikidata core starts immediately; identity resolution only runs when the
  // client did not send the join keys (both run in parallel).
  const wdPromise = runWithFailover((provider, run) =>
    getDiscography(artistId, provider, lang, run)
  )
  const identity = await resolveIdentity(artistId, lang, params)

  const sources: SourceStatusMap = {}
  const [wdOutcome, mbOutcome, discogsOutcome] = await Promise.allSettled([
    wdPromise,
    fetchMusicBrainz(identity.mbid),
    fetchDiscogsReleases(identity.discogsId, params.name),
  ])

  let wdResponse = emptyResponse()
  if (wdOutcome.status === "fulfilled") {
    wdResponse = wdOutcome.value.response
    Object.assign(sources, wdOutcome.value.sources)
  } else {
    sources.wikidata = statusFromError(wdOutcome.reason)
  }

  let mbData: MusicBrainzArtist | undefined
  if (!identity.mbid) {
    sources.musicbrainz = "skipped"
  } else if (mbOutcome.status === "rejected") {
    sources.musicbrainz = statusFromError(mbOutcome.reason)
  } else if (mbOutcome.value) {
    mbData = mbOutcome.value
    sources.musicbrainz = mbData.releaseGroups.length > 0 ? "ok" : "empty"
  } else {
    sources.musicbrainz = "empty"
  }

  let discogsReleases: DiscogsRelease[] = []
  if (!isDiscogsEnabled()) {
    sources.discogs = "skipped"
  } else if (discogsOutcome.status === "rejected") {
    sources.discogs = statusFromError(discogsOutcome.reason)
  } else if (discogsOutcome.value) {
    discogsReleases = discogsOutcome.value
    sources.discogs = discogsReleases.length > 0 ? "ok" : "empty"
  } else {
    sources.discogs = "empty"
  }

  const records = mergeAlbumRecords(
    mbData ? albumRecordsFromMusicBrainz(mbData) : [],
    albumRecordsFromBindings(wdResponse),
    albumRecordsFromDiscogs(discogsReleases)
  )

  return { results: { bindings: albumBindings(records) }, sources }
}

/** MusicBrainz-only discography, used by the profile "MusicBrainz" view. */
export async function musicBrainzDiscographyResponse(
  mbid: string
): Promise<SparqlResponse> {
  const data = await getMusicBrainzArtist(mbid)
  const records = albumRecordsFromMusicBrainz(data)
  return {
    results: { bindings: albumBindings(records) },
    sources: { musicbrainz: records.length > 0 ? "ok" : "empty" },
  }
}

/**
 * Server-side replacement for the old client fallback: when an explicit
 * engine returns no releases and the MBID is known, serve MusicBrainz.
 */
export async function withMusicBrainzFallback(
  response: SparqlResponse,
  mbid?: string
): Promise<SparqlResponse> {
  if (!mbid || response.results.bindings.length > 0) return response
  try {
    const mb = await musicBrainzDiscographyResponse(mbid)
    return {
      ...mb,
      sources: mergedSources(response.sources, mb.sources),
    }
  } catch (err) {
    return {
      ...response,
      sources: mergedSources(response.sources, {
        musicbrainz: statusFromError(err),
      }),
    }
  }
}

// ── Influences & collaborations merge ──────────────────────────────────────

export interface AutoRelationsParams {
  mbid?: string
}

export async function autoInfluences(
  artistId: string,
  lang: Lang,
  params: AutoRelationsParams = {}
): Promise<SparqlResponse> {
  const wdPromise = runWithFailover((provider, run) =>
    getInfluences(artistId, provider, lang, run)
  )
  const identity = await resolveIdentity(artistId, lang, params)

  const sources: SourceStatusMap = {}
  const [wdOutcome, mbOutcome] = await Promise.allSettled([
    wdPromise,
    fetchMusicBrainzCore(identity.mbid),
  ])

  let wdResponse = emptyResponse()
  if (wdOutcome.status === "fulfilled") {
    wdResponse = wdOutcome.value.response
    Object.assign(sources, wdOutcome.value.sources)
  } else {
    sources.wikidata = statusFromError(wdOutcome.reason)
  }

  const bindings = [...wdResponse.results.bindings]
  const seenNames = new Set(
    bindings.map((row) => normalizeText(row.influenceLabel?.value ?? ""))
  )

  const mbData = mbOutcome.status === "fulfilled" ? mbOutcome.value : undefined
  if (!identity.mbid) {
    sources.musicbrainz = "skipped"
  } else if (mbOutcome.status === "rejected") {
    sources.musicbrainz = statusFromError(mbOutcome.reason)
  } else if (mbData) {
    // Real MusicBrainz relations only — never presented as P737 influences.
    const relations = mbData.relations.filter(
      (rel) => rel.type === "teacher" || rel.type === "tribute"
    )
    for (const rel of relations) {
      const key = normalizeText(rel.artist.name)
      if (!key || seenNames.has(key)) continue
      seenNames.add(key)
      bindings.push(
        makeRow({
          influence: `https://musicbrainz.org/artist/${rel.artist.id}`,
          influenceLabel: rel.artist.name,
          relationType:
            rel.type === "teacher"
              ? rel.direction === "backward"
                ? "teacher"
                : "student-of"
              : "tribute",
          source: "musicbrainz",
        })
      )
    }
    sources.musicbrainz = relations.length > 0 ? "ok" : "empty"
  } else {
    sources.musicbrainz = "empty"
  }

  return { results: { bindings }, sources }
}

export async function autoCollaborations(
  artistId: string,
  lang: Lang,
  params: AutoRelationsParams = {}
): Promise<SparqlResponse> {
  const wdPromise = runWithFailover((provider, run) =>
    getCollaborations(artistId, provider, lang, run)
  )
  const identity = await resolveIdentity(artistId, lang, params)

  const sources: SourceStatusMap = {}
  const [wdOutcome, mbOutcome] = await Promise.allSettled([
    wdPromise,
    fetchMusicBrainzCore(identity.mbid),
  ])

  let wdResponse = emptyResponse()
  if (wdOutcome.status === "fulfilled") {
    wdResponse = wdOutcome.value.response
    Object.assign(sources, wdOutcome.value.sources)
  } else {
    sources.wikidata = statusFromError(wdOutcome.reason)
  }

  const bindings = [...wdResponse.results.bindings]
  const seenNames = new Set(
    bindings.map((row) => normalizeText(row.collaboratorLabel?.value ?? ""))
  )

  const mbData = mbOutcome.status === "fulfilled" ? mbOutcome.value : undefined
  if (!identity.mbid) {
    sources.musicbrainz = "skipped"
  } else if (mbOutcome.status === "rejected") {
    sources.musicbrainz = statusFromError(mbOutcome.reason)
  } else if (mbData) {
    const relations = mbData.relations.filter(
      (rel) => rel.type === "collaboration" && rel.artist.id !== mbData.id
    )
    for (const rel of relations) {
      const key = normalizeText(rel.artist.name)
      if (!key || seenNames.has(key)) continue
      seenNames.add(key)
      bindings.push(
        makeRow({
          collaborator: `https://musicbrainz.org/artist/${rel.artist.id}`,
          collaboratorLabel: rel.artist.name,
          relationType: "collaboration",
          source: "musicbrainz",
        })
      )
    }
    sources.musicbrainz = relations.length > 0 ? "ok" : "empty"
  } else {
    sources.musicbrainz = "empty"
  }

  return { results: { bindings }, sources }
}

// ── Artist enrichment (bio + members + genres) ─────────────────────────────

export interface EnrichmentParams {
  mbid?: string
}

export async function artistEnrichment(
  artistId: string,
  lang: Lang,
  params: EnrichmentParams = {}
): Promise<SparqlResponse> {
  const sources: SourceStatusMap = {}

  let resolved: Awaited<ReturnType<typeof resolveArtistData>> | undefined
  try {
    resolved = await resolveArtistData(artistId, lang)
    sources.wikidata = "ok"
  } catch (err) {
    sources.wikidata = statusFromError(err)
  }

  const otherLang: Lang = lang === "es" ? "en" : "es"
  const activeSite = resolved?.sitelinks[lang]
  const wikiLang: Lang = activeSite ? lang : otherLang
  const wikiTitle = activeSite ?? resolved?.sitelinks[otherLang]
  const esTitle = resolved?.sitelinks.es
  const mbid = params.mbid ?? resolved?.mbid

  const [wikiOutcome, mbOutcome] = await Promise.allSettled([
    wikiTitle ? getWikipediaSummary(wikiLang, wikiTitle) : Promise.resolve(null),
    fetchMusicBrainzCore(mbid),
  ])

  // Bio precedence: Wikipedia (UI language) → DBpedia ES → Wikidata description.
  let bio: ArtistBio | undefined

  if (!wikiTitle) {
    sources.wikipedia = "skipped"
  } else if (wikiOutcome.status === "rejected") {
    sources.wikipedia = statusFromError(wikiOutcome.reason)
  } else if (wikiOutcome.value) {
    bio = {
      text: wikiOutcome.value.extract,
      source: "wikipedia",
      url: wikiOutcome.value.url,
    }
    sources.wikipedia = "ok"
  } else {
    sources.wikipedia = "empty"
  }

  // DBpedia ES is only consulted as a fallback (Spanish UI + eswiki sitelink),
  // so a slow es.dbpedia never delays a successful Wikipedia bio.
  if (bio || !(lang === "es" && esTitle)) {
    sources.dbpedia = "skipped"
  } else {
    try {
      const abstract = await getDbpediaEsAbstract(esTitle)
      if (abstract) {
        bio = { text: abstract, source: "dbpedia" }
        sources.dbpedia = "ok"
      } else {
        sources.dbpedia = "empty"
      }
    } catch (err) {
      sources.dbpedia = statusFromError(err)
    }
  }

  if (!bio && resolved?.description) {
    bio = { text: resolved.description, source: "wikidata" }
  }

  let members: ArtistMember[] | undefined
  let genres: string[] | undefined

  if (!mbid) {
    sources.musicbrainz = "skipped"
  } else if (mbOutcome.status === "rejected") {
    sources.musicbrainz = statusFromError(mbOutcome.reason)
  } else if (mbOutcome.value) {
    const mbData = mbOutcome.value
    sources.musicbrainz = "ok"

    if (mbData.type === "Group") {
      const groupMembers = mbData.relations
        .filter((rel) => rel.type === "member of band" && rel.artist.id !== mbid)
        .map((rel) => ({
          name: rel.artist.name,
          mbid: rel.artist.id,
          attributes: rel.attributes.length > 0 ? rel.attributes : undefined,
        }))
      if (groupMembers.length > 0) members = groupMembers
    }

    // Only curated MusicBrainz genres are merged into the profile: raw tags
    // are folksonomy (noise like "60s", "uk" or vandalised labels).
    const mbGenres = [...new Set(mbData.genres.filter(Boolean))]
    if (mbGenres.length > 0) genres = mbGenres
  } else {
    sources.musicbrainz = "empty"
  }

  return {
    results: { bindings: [] },
    sources,
    enrichment: { bio, members, genres },
  }
}
