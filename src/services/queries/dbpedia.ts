import type { Lang } from "../providers"
import { labelBlocks } from "./labels"

// ── DBpedia query builders (Virtuoso) ──────────────────────────────────────
//
// Notes learned from the live endpoint:
//   * dbpedia.org only hosts the English chapter: bands are dbo:Band/dbo:Group,
//     NOT dbo:MusicalArtist. All three types must be matched explicitly.
//   * FILTER CONTAINS(...) full-scans; the bif:contains text index is fast.
//   * dbo:abstract is not present in the public endpoint anymore, but
//     dbo:description and foaf:depiction are.
//   * Virtuoso has no label service: labels resolve with OPTIONAL + COALESCE.

export const DBPEDIA_PREFIXES = `PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX dbp: <http://dbpedia.org/property/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX bif: <bif:>`

export const DBPEDIA_ARTIST_TYPES = ["dbo:MusicalArtist", "dbo:Band", "dbo:Group"]

/**
 * Label resolution over a property chain, e.g. `?artist dbo:genre ?genre`.
 * Generates the OPTIONAL/BIND blocks that Virtuoso can execute.
 */
function chainedLabelBlocks(chain: string, alias: string, lang: Lang): string {
  const codes = lang === "es" ? ["es", "en"] : ["en", "es"]
  const blocks = codes.map(
    (code, index) =>
      `OPTIONAL { ${chain} ?${alias}Node${index} . ?${alias}Node${index} rdfs:label ?${alias}${index} . FILTER(lang(?${alias}${index}) = "${code}") }`
  )
  const fallbacks = codes.map((_, index) => `?${alias}${index}`).join(", ")
  blocks.push(`BIND(COALESCE(${fallbacks}) AS ?${alias})`)
  return blocks.join("\n  ")
}

/**
 * Artist search on DBpedia. `term` must already be a safe Virtuoso free-text
 * expression (see `buildTextIndexExpression`: single token or quoted phrase).
 * A subquery LIMIT resolves the matching artists first; enrichment joins run
 * only over those ~30 resources (the full query with inline label chains times
 * out on Virtuoso). Genre/country/instrument labels arrive via
 * buildDbpediaArtistTraitsQuery in a second batched pass.
 */
export function buildDbpediaArtistSearchQuery(
  term: string,
  lang: Lang,
  filters: { decade?: string } = {}
): string {
  const decadeFilter = filters.decade
    ? `\n  FILTER(?birthDate >= "${filters.decade}-01-01"^^xsd:date && ?birthDate < "${Number(filters.decade) + 10}-01-01"^^xsd:date)`
    : ""

  return `${DBPEDIA_PREFIXES}
SELECT DISTINCT ?artist ?artistLabel ?artistDescription ?birthDate ?image
WHERE {
  { SELECT DISTINCT ?artist WHERE {
      ?artist a ?artistType .
      VALUES ?artistType { ${DBPEDIA_ARTIST_TYPES.join(" ")} }
      ?artist rdfs:label ?matchLabel .
      FILTER(lang(?matchLabel) IN ("en", "es"))
      ?matchLabel bif:contains "${term}" .
  } LIMIT 30 }
  OPTIONAL { ?artist dbo:birthDate ?birthDate }${decadeFilter}
  OPTIONAL { ?artist dbo:thumbnail ?image }
  ${labelBlocks("?artist", "artistLabel", lang)}
  ${labelBlocks("?artist", "artistDescription", lang, "dbo:description")}
}`
}

/**
 * Batched genre/country/instrument labels for the artists returned by the
 * search query. VALUES-bound, so Virtuoso resolves it in under a second.
 */
export function buildDbpediaArtistTraitsQuery(
  artistUris: string[],
  lang: Lang
): string {
  const values = artistUris.map((uri) => `<${uri}>`).join(" ")

  return `${DBPEDIA_PREFIXES}
SELECT DISTINCT ?artist ?genreLabel ?countryLabel ?instrumentLabel WHERE {
  VALUES ?artist { ${values} }
  ${chainedLabelBlocks("?artist dbo:genre", "genreLabel", lang)}
  ${chainedLabelBlocks("?artist dbo:birthPlace", "countryLabel", lang)}
  ${chainedLabelBlocks("?artist dbo:instrument", "instrumentLabel", lang)}
}`
}

export function buildDbpediaDiscographyQuery(resourceUrl: string): string {
  // Label-free: labels resolve in a batched pass (inline label joins made the
  // query slow enough for Virtuoso to return inconsistent partial results).
  return `${DBPEDIA_PREFIXES}
SELECT DISTINCT ?album ?releaseDate ?label ?genre
WHERE {
  ?album a dbo:Album ;
         dbo:artist <${resourceUrl}> .
  OPTIONAL { ?album dbo:releaseDate ?releaseDate }
  OPTIONAL { ?album dbo:recordLabel ?label }
  OPTIONAL { ?album dbo:genre ?genre }
}
ORDER BY ?releaseDate
LIMIT 50`
}

export function buildDbpediaInfluencesQuery(resourceUrl: string): string {
  return `${DBPEDIA_PREFIXES}
SELECT DISTINCT ?influence ?birthDate ?country ?genre ?image
WHERE {
  <${resourceUrl}> dbo:influencedBy ?influence .
  OPTIONAL { ?influence dbo:birthDate ?birthDate }
  OPTIONAL { ?influence dbo:birthPlace ?country }
  OPTIONAL { ?influence dbo:genre ?genre }
  OPTIONAL { ?influence dbo:thumbnail ?image }
}
LIMIT 20`
}

export function buildDbpediaCollaborationsQuery(resourceUrl: string): string {
  // Require a label on both ends: unlabeled DBpedia resources produce junk rows.
  return `${DBPEDIA_PREFIXES}
SELECT DISTINCT ?work ?collaborator ?releaseDate
WHERE {
  ?work a dbo:Song ;
        dbo:artist <${resourceUrl}> ;
        dbo:artist ?collaborator .
  FILTER(?collaborator != <${resourceUrl}>)
  ?work rdfs:label ?workMatch . FILTER(lang(?workMatch) IN ("en", "es"))
  ?collaborator rdfs:label ?collaboratorMatch . FILTER(lang(?collaboratorMatch) IN ("en", "es"))
  OPTIONAL { ?work dbo:releaseDate ?releaseDate }
}
ORDER BY DESC(?releaseDate)
LIMIT 30`
}
