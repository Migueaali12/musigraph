import type { Engine, Lang } from "../providers"
import { labelBlocks, labelServiceBlock } from "./labels"

// ── Wikidata query builders ────────────────────────────────────────────────
//
// All builders are pure string factories. Engine differences:
//   blazegraph → wikibase:label service (v1, fast, language priority)
//   qlever     → no labels in the main query; the API route resolves them in
//                a batched VALUES pass (see buildBatchLabelsQuery)
//
// Every query is written so the QLever version is SPARQL 1.1 pure: no hints,
// no named subqueries, no property paths where a VALUES join is cheaper.

export const WD_PREFIXES = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>`

/** Release types counted as "albums" for discographies. */
export const ALBUM_TYPE_QIDS = [
  "Q482994", // album
  "Q208569", // studio album
  "Q209939", // live album
  "Q222910", // compilation album
  "Q169930", // extended play
  "Q134556", // single
] as const

/** Release types used to classify collaboration works as albums (singles excluded). */
export const RELEASE_WORK_TYPE_QIDS = [
  "Q482994",
  "Q208569",
  "Q209939",
  "Q222910",
  "Q169930",
] as const

export interface ArtistSearchFilters {
  genre?: string
  decade?: string
}

const VALUES_QIDS = (qids: readonly string[]) => qids.map((id) => `wd:${id}`).join(" ")

/**
 * Artist profile: exactly one row per artist (no multi-valued properties, so
 * no cartesian explosion). Multi-valued traits live in buildArtistTraitsQuery.
 */
export function buildArtistProfileQuery(
  artistIds: string[],
  filters: ArtistSearchFilters,
  engine: Engine,
  lang: Lang
): string {
  const values = artistIds.map((id) => `wd:${id}`).join(" ")

  let filterBlock = ""
  if (filters.genre) {
    filterBlock += `\n  ?artist wdt:P136 wd:${filters.genre} .`
  }
  if (filters.decade) {
    const start = Number(filters.decade)
    filterBlock += `
  BIND(COALESCE(?birthDate, ?formationDate) AS ?startDate)
  FILTER(YEAR(?startDate) >= ${start} && YEAR(?startDate) <= ${start + 9})`
  }

  const dataBlock = `
  VALUES ?artist { ${values} }
  OPTIONAL { ?artist wdt:P434 ?mbid }
  OPTIONAL { ?artist wdt:P569 ?birthDate }
  OPTIONAL { ?artist wdt:P571 ?formationDate }
  OPTIONAL { ?artist wdt:P27 ?citizenship }
  OPTIONAL { ?artist wdt:P495 ?origin }
  BIND(COALESCE(?citizenship, ?origin) AS ?country)
  OPTIONAL { ?artist wdt:P18 ?image }
  OPTIONAL { ?artist wikibase:sitelinks ?sitelinks }
  OPTIONAL { ?artist wdt:P1953 ?discogsId }
  OPTIONAL { ?artist wdt:P1902 ?spotifyId }
  OPTIONAL { ?artist wdt:P3192 ?lastfmId }
  OPTIONAL { ?artist wdt:P1728 ?allmusicId }`

  const isV1 = engine === "blazegraph"
  const labelProjection = isV1 ? " ?artistLabel ?artistDescription ?countryLabel" : ""
  const labelBlock = isV1 ? `\n  ${labelServiceBlock(lang)}` : ""

  return `${WD_PREFIXES}
SELECT ?artist ?sitelinks ?mbid ?birthDate ?formationDate ?country ?image ?discogsId ?spotifyId ?lastfmId ?allmusicId${labelProjection}
WHERE {${dataBlock}${filterBlock}${labelBlock}
}`
}

/**
 * Artist traits: multi-valued properties fetched through a property variable
 * with VALUES. The VALUES-bound single join is fast on Blazegraph cold
 * (~0.5 s), while a UNION with VALUES outside the branches took 60 s+.
 * The route maps ?prop/?trait rows back to named fields (genre, instrument…).
 */
export function buildArtistTraitsQuery(
  artistIds: string[],
  engine: Engine,
  lang: Lang
): string {
  const values = artistIds.map((id) => `wd:${id}`).join(" ")

  const dataBlock = `
  VALUES ?artist { ${values} }
  VALUES ?prop { wdt:P136 wdt:P1303 wdt:P31 wdt:P106 }
  ?artist ?prop ?trait .`

  if (engine === "blazegraph") {
    return `${WD_PREFIXES}
SELECT ?artist ?prop ?trait ?traitLabel
WHERE {${dataBlock}
  ${labelServiceBlock(lang)}
}`
  }

  return `${WD_PREFIXES}
SELECT ?artist ?prop ?trait
WHERE {${dataBlock}
}`
}

export function buildDiscographyQuery(
  artistId: string,
  engine: Engine,
  lang: Lang
): string {
  const types = VALUES_QIDS(ALBUM_TYPE_QIDS)

  if (engine === "blazegraph") {
    // LIMIT before the label service: only ~60 rows get labelled.
    return `${WD_PREFIXES}
SELECT ?album ?albumLabel ?releaseDate ?label ?labelLabel ?genre ?genreLabel ?albumType ?albumTypeLabel ?mbReleaseGroupId WHERE {
  {
    SELECT DISTINCT ?album ?releaseDate ?label ?genre ?albumType ?mbReleaseGroupId WHERE {
      VALUES ?albumType { ${types} }
      ?album wdt:P31 ?albumType ; wdt:P175 wd:${artistId} .
      OPTIONAL { ?album wdt:P577 ?releaseDate }
      OPTIONAL { ?album wdt:P264 ?label }
      OPTIONAL { ?album wdt:P136 ?genre }
      OPTIONAL { ?album wdt:P436 ?mbReleaseGroupId }
    }
    ORDER BY ?releaseDate
    LIMIT 60
  }
  ${labelServiceBlock(lang)}
}`
  }

  return `${WD_PREFIXES}
SELECT ?album ?releaseDate ?label ?genre ?albumType ?mbReleaseGroupId WHERE {
  VALUES ?albumType { ${types} }
  ?album wdt:P31 ?albumType ; wdt:P175 wd:${artistId} .
  OPTIONAL { ?album wdt:P577 ?releaseDate }
  OPTIONAL { ?album wdt:P264 ?label }
  OPTIONAL { ?album wdt:P136 ?genre }
  OPTIONAL { ?album wdt:P436 ?mbReleaseGroupId }
}
ORDER BY ?releaseDate
LIMIT 60`
}

export function buildInfluencesQuery(
  artistId: string,
  engine: Engine,
  lang: Lang
): string {
  const dataBlock = `{
    SELECT DISTINCT ?influence ?relationType WHERE {
      { wd:${artistId} wdt:P737 ?influence . BIND("influenced-by" AS ?relationType) }
      UNION { ?influence wdt:P737 wd:${artistId} . BIND("influenced" AS ?relationType) }
      UNION { wd:${artistId} wdt:P1066 ?influence . BIND("student-of" AS ?relationType) }
    }
    LIMIT 40
  }
  OPTIONAL { ?influence wdt:P569 ?birthDate }
  OPTIONAL { ?influence wdt:P571 ?birthDate }
  OPTIONAL { ?influence wdt:P27 ?country }
  OPTIONAL { ?influence wdt:P136 ?genre }
  OPTIONAL { ?influence wdt:P18 ?image }
  OPTIONAL { ?influence wikibase:sitelinks ?sitelinks }`

  if (engine === "blazegraph") {
    return `${WD_PREFIXES}
SELECT ?influence ?influenceLabel ?relationType ?birthDate ?country ?countryLabel ?genre ?genreLabel ?image ?sitelinks WHERE {
  ${dataBlock}
  ${labelServiceBlock(lang)}
}`
  }

  return `${WD_PREFIXES}
SELECT ?influence ?relationType ?birthDate ?country ?genre ?image ?sitelinks WHERE {
  ${dataBlock}
}`
}

export function buildCollaborationsQuery(
  artistId: string,
  engine: Engine,
  lang: Lang
): string {
  // P175 (performer) with two distinct values = a collaboration.
  // The instance-type classification happens later in a batched pass,
  // because property paths and inline type checks made this query 60x slower.
  const dataBlock = `{
    SELECT DISTINCT ?work ?collaborator ?releaseDate WHERE {
      ?work wdt:P175 wd:${artistId} ; wdt:P175 ?collaborator .
      FILTER(?collaborator != wd:${artistId})
      OPTIONAL { ?work wdt:P577 ?releaseDate }
    }
    ORDER BY DESC(?releaseDate)
    LIMIT 60
  }`

  if (engine === "blazegraph") {
    return `${WD_PREFIXES}
SELECT ?work ?workLabel ?collaborator ?collaboratorLabel ?releaseDate WHERE {
  ${dataBlock}
  ${labelServiceBlock(lang)}
}`
  }

  return `${WD_PREFIXES}
SELECT ?work ?collaborator ?releaseDate WHERE {
  ${dataBlock}
}`
}

export function buildGenreSearchQuery(
  genreId: string,
  engine: Engine,
  lang: Lang
): string {
  const dataBlock = `{
    { ?artist wdt:P31 wd:Q215380 . }
    UNION
    { ?artist wdt:P31 wd:Q5 ; wdt:P106 wd:Q639669 . }
  }
  ?artist wdt:P136 wd:${genreId} .
  OPTIONAL { ?artist wdt:P495 ?country }
  OPTIONAL { ?artist wdt:P27 ?country }
  OPTIONAL { ?artist wdt:P571 ?formationDate }
  OPTIONAL { ?artist wikibase:sitelinks ?sitelinks }`

  if (engine === "blazegraph") {
    return `${WD_PREFIXES}
SELECT ?artist ?artistLabel ?country ?countryLabel ?formationDate ?sitelinks WHERE {
  ${dataBlock}
  ${labelServiceBlock(lang)}
}
ORDER BY ?formationDate
LIMIT 20`
  }

  return `${WD_PREFIXES}
SELECT ?artist ?country ?formationDate ?sitelinks WHERE {
  ${dataBlock}
}
ORDER BY ?formationDate
LIMIT 20`
}

/**
 * Batched label resolution for engines without the label service (QLever).
 * One VALUES pass resolves every entity of a result set in milliseconds.
 */
export function buildBatchLabelsQuery(
  entities: string[],
  lang: Lang,
  options: { descriptions?: boolean } = {}
): string {
  const values = entities.map((uri) => `<${uri}>`).join(" ")
  const labelBlock = labelBlocks("?entity", "entityLabel", lang)
  const descriptionBlock = options.descriptions
    ? labelBlocks("?entity", "entityDescription", lang, "schema:description")
    : ""
  const descriptionProjection = options.descriptions ? " ?entityDescription" : ""

  return `${WD_PREFIXES}
SELECT ?entity ?entityLabel${descriptionProjection} WHERE {
  VALUES ?entity { ${values} }
  ${labelBlock}
  ${descriptionBlock}
}`
}

/**
 * Batched classification of collaboration works into songs vs albums.
 * Direct P31 match (no OPTIONAL/BIND, no property path): ~7x faster on WDQS.
 * Works not returned by this query are treated as songs.
 */
export function buildWorkTypeQuery(entities: string[]): string {
  const values = entities.map((uri) => `<${uri}>`).join(" ")
  const types = VALUES_QIDS(RELEASE_WORK_TYPE_QIDS)

  return `${WD_PREFIXES}
SELECT ?entity WHERE {
  VALUES ?entity { ${values} }
  VALUES ?workTypeValue { ${types} }
  ?entity wdt:P31 ?workTypeValue .
}`
}
