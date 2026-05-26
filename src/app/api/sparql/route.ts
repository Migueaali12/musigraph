import { type NextRequest, NextResponse } from "next/server"

// Allow up to 30 s for outbound SPARQL calls (Vercel / Next.js serverless)
export const maxDuration = 30

// ── Types ──────────────────────────────────────────────────────────────────

interface SparqlBinding {
  [key: string]: { value: string; type: string }
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] }
}

type SparqlAction =
  | "searchArtist"
  | "getArtistDiscography"
  | "getArtistInfluences"
  | "getCollaborations"
  | "searchByGenre"
  | "getTopBands"

interface SparqlRequestBody {
  action: SparqlAction
  params: Record<string, string | undefined>
}

// ── Endpoints ──────────────────────────────────────────────────────────────

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql"
const DBPEDIA_ENDPOINT = "https://dbpedia.org/sparql"

// ── Core fetch (server-side only — endpoint URL never exposed to client) ───

async function executeSparqlQuery(
  query: string,
  endpoint: string = WIKIDATA_ENDPOINT
): Promise<SparqlResponse> {
  // Abort after 25 s so we return a clean error before Next.js hard-kills the function
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25_000)
  const start = Date.now()

  const endpointLabel = endpoint.includes("dbpedia") ? "DBpedia" : "Wikidata"
  const queryPreview = query.replace(/\s+/g, " ").trim().slice(0, 120)
  console.log(`[SPARQL] → ${endpointLabel} | query: ${queryPreview}…`)

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/sparql-query",
        Accept: "application/sparql-results+json",
        "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
      },
      body: query,
      signal: controller.signal,
    })

    const elapsed = Date.now() - start

    if (!response.ok) {
      console.error(`[SPARQL] ✗ ${endpointLabel} HTTP ${response.status} ${response.statusText} (${elapsed} ms)`)
      throw new Error(`SPARQL query failed: ${response.statusText}`)
    }

    const data = (await response.json()) as SparqlResponse
    const count = data.results?.bindings?.length ?? 0
    console.log(`[SPARQL] ✓ ${endpointLabel} | ${count} result(s) | ${elapsed} ms`)
    return data
  } catch (err) {
    const elapsed = Date.now() - start
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[SPARQL] ✗ ${endpointLabel} | TIMEOUT after ${elapsed} ms`)
      throw new Error("SPARQL query timed out after 25 seconds")
    }
    console.error(`[SPARQL] ✗ ${endpointLabel} | ${err instanceof Error ? err.message : String(err)} (${elapsed} ms)`)
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── Wikidata entity-search via MediaWiki API (indexed — much faster than SPARQL CONTAINS) ───

async function resolveWikidataEntityIds(
  name: string,
  limit = 12
): Promise<string[]> {
  const url = new URL("https://www.wikidata.org/w/api.php")
  url.searchParams.set("action", "wbsearchentities")
  url.searchParams.set("search", name)
  url.searchParams.set("language", "en")
  url.searchParams.set("uselang", "en")
  url.searchParams.set("type", "item")
  url.searchParams.set("format", "json")
  url.searchParams.set("limit", String(limit))

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8_000)
  const start = Date.now()

  try {
    console.log(`[wbsearch] → searching "${name}" (limit ${limit})`)
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "MusiGraph/1.0 (https://musigraph.app)" },
      signal: controller.signal,
    })
    if (!res.ok) {
      console.warn(`[wbsearch] ✗ HTTP ${res.status} (${Date.now() - start} ms)`)
      return []
    }
    const data = (await res.json()) as { search?: { id: string }[] }
    const ids = (data.search ?? []).map((item) => item.id)
    console.log(`[wbsearch] ✓ ${ids.length} entity ID(s) in ${Date.now() - start} ms → ${ids.join(", ")}`)
    return ids
  } catch (err) {
    console.warn(`[wbsearch] ✗ ${err instanceof Error ? err.message : String(err)} (${Date.now() - start} ms)`)
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── Query builders ─────────────────────────────────────────────────────────

async function searchArtist(
  name: string,
  filters: Record<string, string | undefined>,
  endpoint: string
): Promise<SparqlResponse> {
  const isDbpedia = endpoint.includes("dbpedia")

  if (isDbpedia) {
    let filterStr = ""
    if (name?.trim()) {
      filterStr += `FILTER (CONTAINS(LCASE(?artistLabel), LCASE("${name}")))\n`
    }
    if (filters.genre) {
      filterStr += `?artist dbo:genre <http://dbpedia.org/resource/${filters.genre}> .\n`
    }
    const query = `
      SELECT DISTINCT ?artist ?artistLabel ?birthDate ?countryLabel ?genreLabel ?instrumentLabel ?image
      WHERE {
        ?artist a dbo:MusicalArtist ;
                rdfs:label ?artistLabel .
        FILTER (lang(?artistLabel) = 'es' || lang(?artistLabel) = 'en')
        ${filterStr}
        OPTIONAL { ?artist dbo:birthDate ?birthDate }
        OPTIONAL { ?artist dbo:birthPlace/rdfs:label ?countryLabel . FILTER (lang(?countryLabel) = 'es' || lang(?countryLabel) = 'en') }
        OPTIONAL { ?artist dbo:genre/rdfs:label ?genreLabel . FILTER (lang(?genreLabel) = 'es' || lang(?genreLabel) = 'en') }
        OPTIONAL { ?artist dbo:instrument/rdfs:label ?instrumentLabel . FILTER (lang(?instrumentLabel) = 'es' || lang(?instrumentLabel) = 'en') }
        OPTIONAL { ?artist foaf:depiction ?image }
        OPTIONAL { ?artist dbo:thumbnail ?image }
      }
      ORDER BY ?artistLabel
      LIMIT 30
    `
    return executeSparqlQuery(query, endpoint)
  }

  // Wikidata — two-step approach:
  //  1. Resolve the artist name to Q-IDs via the fast wbsearchentities API
  //  2. Fetch details with a VALUES-bounded SPARQL query (no full-table scan)
  const trimmedName = name?.trim() ?? ""

  if (trimmedName) {
    const entityIds = await resolveWikidataEntityIds(trimmedName)

    if (entityIds.length === 0) {
      console.log(`[searchArtist] No entity IDs found for "${trimmedName}", returning empty`)
      return { results: { bindings: [] } }
    }

    const valuesClause = entityIds.map((id) => `wd:${id}`).join(" ")

    let extraFilters = ""
    if (filters.genre) extraFilters += `?artist wdt:P136 wd:${filters.genre} .\n`
    if (filters.decade) {
      extraFilters += `
        ?artist wdt:P571 ?formationDate .
        FILTER (YEAR(?formationDate) >= ${filters.decade} && YEAR(?formationDate) < ${parseInt(filters.decade) + 10})
      `
    }

    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>

      SELECT DISTINCT ?artist ?artistLabel ?mbid ?birthDate ?country ?countryLabel ?genre ?genreLabel ?instrument ?instrumentLabel ?image
      WHERE {
        VALUES ?artist { ${valuesClause} }
        ${extraFilters}
        OPTIONAL { ?artist wdt:P434 ?mbid }
        OPTIONAL { ?artist wdt:P569 ?birthDate }
        OPTIONAL { ?artist wdt:P571 ?birthDate }
        OPTIONAL { ?artist wdt:P27 ?country }
        OPTIONAL { ?artist wdt:P495 ?country }
        OPTIONAL { ?artist wdt:P136 ?genre }
        OPTIONAL { ?artist wdt:P1303 ?instrument }
        OPTIONAL { ?artist wdt:P18 ?image }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
    `
    return executeSparqlQuery(query, endpoint)
  }

  // No name given — return a curated list of well-known artists (fast VALUES query)
  const fallbackValues = [
    "wd:Q1299",  // The Beatles
    "wd:Q2306",  // Pink Floyd
    "wd:Q5384",  // Led Zeppelin
    "wd:Q1321",  // Rolling Stones
    "wd:Q392",   // Bob Dylan
    "wd:Q1233",  // Radiohead
    "wd:Q11649", // Nirvana
    "wd:Q83160", // David Bowie
    "wd:Q4930",  // Johnny Cash
    "wd:Q1364",  // Miles Davis
  ].join(" ")

  let extraFilters = ""
  if (filters.genre) extraFilters += `?artist wdt:P136 wd:${filters.genre} .\n`

  const query = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX wikibase: <http://wikiba.se/ontology#>
    PREFIX bd: <http://www.bigdata.com/rdf#>

    SELECT DISTINCT ?artist ?artistLabel ?mbid ?birthDate ?country ?countryLabel ?genre ?genreLabel ?instrument ?instrumentLabel ?image
    WHERE {
      VALUES ?artist { ${fallbackValues} }
      ${extraFilters}
      OPTIONAL { ?artist wdt:P434 ?mbid }
      OPTIONAL { ?artist wdt:P569 ?birthDate }
      OPTIONAL { ?artist wdt:P571 ?birthDate }
      OPTIONAL { ?artist wdt:P27 ?country }
      OPTIONAL { ?artist wdt:P495 ?country }
      OPTIONAL { ?artist wdt:P136 ?genre }
      OPTIONAL { ?artist wdt:P1303 ?instrument }
      OPTIONAL { ?artist wdt:P18 ?image }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
  `
  return executeSparqlQuery(query, endpoint)
}

async function getDiscography(
  artistId: string,
  endpoint: string
): Promise<SparqlResponse> {
  if (endpoint.includes("dbpedia")) {
    const query = `
      SELECT DISTINCT ?album ?albumLabel ?releaseDate ?labelLabel ?genreLabel
      WHERE {
        ?album a dbo:Album ;
               dbo:artist <${artistId}> ;
               rdfs:label ?albumLabel .
        FILTER (lang(?albumLabel) = 'es' || lang(?albumLabel) = 'en')
        OPTIONAL { ?album dbo:releaseDate ?releaseDate }
        OPTIONAL { ?album dbp:released ?releaseDate }
        OPTIONAL { ?album dbo:recordLabel/rdfs:label ?labelLabel . FILTER (lang(?labelLabel) = 'es' || lang(?labelLabel) = 'en') }
        OPTIONAL { ?album dbo:genre/rdfs:label ?genreLabel . FILTER (lang(?genreLabel) = 'es' || lang(?genreLabel) = 'en') }
      }
      ORDER BY ?releaseDate
      LIMIT 50
    `
    return executeSparqlQuery(query, endpoint)
  }

  const query = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX wikibase: <http://wikiba.se/ontology#>
    PREFIX bd: <http://www.bigdata.com/rdf#>

    SELECT DISTINCT ?album ?albumLabel ?releaseDate ?label ?labelLabel
    WHERE {
      ?album wdt:P31/wdt:P279* wd:Q482994 ;
             wdt:P175 wd:${artistId} .
      OPTIONAL { ?album wdt:P577 ?releaseDate }
      OPTIONAL { ?album wdt:P264 ?label }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    ORDER BY ?releaseDate
    LIMIT 50
  `
  return executeSparqlQuery(query, endpoint)
}

async function getInfluences(
  artistId: string,
  endpoint: string
): Promise<SparqlResponse> {
  if (endpoint.includes("dbpedia")) {
    const query = `
      SELECT DISTINCT ?influence ?influenceLabel ?birthDate ?countryLabel ?genreLabel ?image
      WHERE {
        <${artistId}> dbo:influencedBy ?influence .
        ?influence rdfs:label ?influenceLabel .
        FILTER (lang(?influenceLabel) = 'es' || lang(?influenceLabel) = 'en')
        OPTIONAL { ?influence dbo:birthDate ?birthDate }
        OPTIONAL { ?influence dbo:birthPlace/rdfs:label ?countryLabel . FILTER (lang(?countryLabel) = 'es' || lang(?countryLabel) = 'en') }
        OPTIONAL { ?influence dbo:genre/rdfs:label ?genreLabel . FILTER (lang(?genreLabel) = 'es' || lang(?genreLabel) = 'en') }
        OPTIONAL { ?influence foaf:depiction ?image }
        OPTIONAL { ?influence dbo:thumbnail ?image }
      }
      LIMIT 20
    `
    return executeSparqlQuery(query, endpoint)
  }

  const query = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX wikibase: <http://wikiba.se/ontology#>
    PREFIX bd: <http://www.bigdata.com/rdf#>

    SELECT DISTINCT ?influence ?influenceLabel ?birthDate ?country ?countryLabel ?genre ?genreLabel ?image
    WHERE {
      wd:${artistId} wdt:P737 ?influence .
      OPTIONAL { ?influence wdt:P569 ?birthDate }
      OPTIONAL { ?influence wdt:P571 ?birthDate }
      OPTIONAL { ?influence wdt:P27 ?country }
      OPTIONAL { ?influence wdt:P495 ?country }
      OPTIONAL { ?influence wdt:P136 ?genre }
      OPTIONAL { ?influence wdt:P18 ?image }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    LIMIT 20
  `
  return executeSparqlQuery(query, endpoint)
}

async function getCollaborations(
  artistId: string,
  endpoint: string
): Promise<SparqlResponse> {
  if (endpoint.includes("dbpedia")) {
    const query = `
      SELECT DISTINCT ?songLabel ?collaboratorLabel ?releaseDate
      WHERE {
        ?song a dbo:Song ;
              dbo:artist <${artistId}> ;
              dbo:artist ?collaborator ;
              rdfs:label ?songLabel .
        FILTER (?collaborator != <${artistId}>)
        FILTER (lang(?songLabel) = 'es' || lang(?songLabel) = 'en')
        ?collaborator rdfs:label ?collaboratorLabel .
        FILTER (lang(?collaboratorLabel) = 'es' || lang(?collaboratorLabel) = 'en')
        OPTIONAL { ?song dbo:releaseDate ?releaseDate }
        OPTIONAL { ?song dbp:released ?releaseDate }
      }
      ORDER BY DESC(?releaseDate)
      LIMIT 30
    `
    return executeSparqlQuery(query, endpoint)
  }

  const query = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX wikibase: <http://wikiba.se/ontology#>
    PREFIX bd: <http://www.bigdata.com/rdf#>

    SELECT DISTINCT ?song ?songLabel ?collaborator ?collaboratorLabel ?releaseDate
    WHERE {
      ?song wdt:P31/wdt:P279* wd:Q7366 ;
            wdt:P175 wd:${artistId} ;
            wdt:P175 ?collaborator .
      FILTER(?collaborator != wd:${artistId})
      OPTIONAL { ?song wdt:P577 ?releaseDate }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    ORDER BY DESC(?releaseDate)
    LIMIT 30
  `
  return executeSparqlQuery(query, endpoint)
}

async function querySearchByGenre(genreId: string): Promise<SparqlResponse> {
  const query = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX wikibase: <http://wikiba.se/ontology#>
    PREFIX bd: <http://www.bigdata.com/rdf#>

    SELECT DISTINCT ?artist ?artistLabel ?country ?countryLabel ?formationDate
    WHERE {
      {
        ?artist wdt:P31 wd:Q215380 .
        ?artist wdt:P136 wd:${genreId} .
      }
      UNION
      {
        ?artist wdt:P31 wd:Q5 .
        ?artist wdt:P106 wd:Q639669 .
        ?artist wdt:P136 wd:${genreId} .
      }
      OPTIONAL { ?artist wdt:P495 ?country }
      OPTIONAL { ?artist wdt:P27 ?country }
      OPTIONAL { ?artist wdt:P571 ?formationDate }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    ORDER BY ?formationDate
    LIMIT 20
  `
  return executeSparqlQuery(query, WIKIDATA_ENDPOINT)
}

async function queryGetTopBands(): Promise<SparqlResponse> {
  const query = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX wikibase: <http://wikiba.se/ontology#>
    PREFIX bd: <http://www.bigdata.com/rdf#>

    SELECT DISTINCT ?artist ?artistLabel ?country ?countryLabel ?genre ?genreLabel ?image
    WHERE {
      VALUES ?artist {
        wd:Q1299
        wd:Q2306
        wd:Q5384
        wd:Q1321
        wd:Q392
      }
      OPTIONAL { ?artist wdt:P495 ?country }
      OPTIONAL { ?artist wdt:P27 ?country }
      OPTIONAL { ?artist wdt:P136 ?genre }
      OPTIONAL { ?artist wdt:P18 ?image }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
  `
  return executeSparqlQuery(query, WIKIDATA_ENDPOINT)
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const reqStart = Date.now()

  try {
    const body = (await request.json()) as SparqlRequestBody
    const { action, params } = body

    const endpoint =
      params.endpoint === DBPEDIA_ENDPOINT ? DBPEDIA_ENDPOINT : WIKIDATA_ENDPOINT
    const endpointLabel = endpoint.includes("dbpedia") ? "DBpedia" : "Wikidata"

    console.log(`[API /sparql] ← action="${action}" endpoint=${endpointLabel} params=${JSON.stringify(params)}`)

    let result: SparqlResponse

    switch (action) {
      case "searchArtist":
        result = await searchArtist(
          params.name ?? "",
          {
            genre: params.genre,
            decade: params.decade,
            artistType: params.artistType,
          },
          endpoint
        )
        break

      case "getArtistDiscography":
        if (!params.artistId) {
          return NextResponse.json({ error: "artistId required" }, { status: 400 })
        }
        result = await getDiscography(params.artistId, endpoint)
        break

      case "getArtistInfluences":
        if (!params.artistId) {
          return NextResponse.json({ error: "artistId required" }, { status: 400 })
        }
        result = await getInfluences(params.artistId, endpoint)
        break

      case "getCollaborations":
        if (!params.artistId) {
          return NextResponse.json({ error: "artistId required" }, { status: 400 })
        }
        result = await getCollaborations(params.artistId, endpoint)
        break

      case "searchByGenre":
        if (!params.genreId) {
          return NextResponse.json({ error: "genreId required" }, { status: 400 })
        }
        result = await querySearchByGenre(params.genreId)
        break

      case "getTopBands":
        result = await queryGetTopBands()
        break

      default:
        console.warn(`[API /sparql] Unknown action: "${action}"`)
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    const totalMs = Date.now() - reqStart
    const count = result.results?.bindings?.length ?? 0
    console.log(`[API /sparql] ✓ action="${action}" | ${count} binding(s) | total ${totalMs} ms`)

    return NextResponse.json(result)
  } catch (error) {
    const totalMs = Date.now() - reqStart
    const message = error instanceof Error ? error.message : "SPARQL query failed"
    console.error(`[API /sparql] ✗ ${message} | total ${totalMs} ms`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
