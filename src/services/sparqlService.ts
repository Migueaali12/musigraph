interface SparqlResponse {
  results: {
    bindings: Array<{
      [key: string]: {
        value: string
        type: string
      }
    }>
  }
}

interface TestConnectionResult {
  success: boolean
  message: string
  sampleData?: Array<{
    [key: string]: {
      value: string
      type: string
    }
  }>
}

interface ArtistInfo {
  id: string
  name: string
  mbid?: string // Nuevo campo para MusicBrainz ID
  birthDate?: string
  country?: string
  genres: string[]
  instruments: string[]
  image?: string
}

interface AlbumInfo {
  id: string
  title: string
  releaseDate?: string
  label?: string
  genre?: string
}

interface CollaborationInfo {
  song: string
  artist1: string
  artist2: string
  releaseDate?: string
}

import { fetchDiscographyFromMusicBrainz } from "./musicbrainzService"
import type { SearchFilters } from "@/components/search/SearchBar"

class SparqlService {
  private endpoint = "https://query.wikidata.org/sparql"
  private cache = new Map<string, SparqlResponse>()

  async query(query: string): Promise<SparqlResponse> {
    const cacheKey = this.hashQuery(query)

    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log("Cache hit for query:", cacheKey)
      return this.cache.get(cacheKey)!
    }

    console.log("Cache miss for query:", cacheKey)
    console.log("Making SPARQL request to endpoint...")

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/sparql-query",
          Accept: "application/sparql-results+json",
          "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
        },
        body: query,
      })

      if (!response.ok) {
        throw new Error(`SPARQL query failed: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("SPARQL response received, caching result")

      // Cache the result
      this.cache.set(cacheKey, data)

      return data
    } catch (error) {
      console.error("SPARQL query error:", error)
      throw error
    }
  }

  private hashQuery(query: string): string {
    return btoa(query).slice(0, 20)
  }

  async searchArtist(
    name: string,
    filters: SearchFilters = {},
    endpoint?: string
  ): Promise<ArtistInfo[]> {
    this.clearSearchCache(name)

    // Si el endpoint es DBpedia, usar query alternativo
    if (endpoint && endpoint.includes("dbpedia")) {
      let filterStr = ""
      if (name?.trim()) {
        filterStr += `FILTER (CONTAINS(LCASE(?artistLabel), LCASE(\"${name}\")))\n`
      }
      if (filters.genre) {
        filterStr += `?artist dbo:genre <http://dbpedia.org/resource/${filters.genre}> .\n`
      }
      if (filters.decade) {
        // Buscar artistas con álbumes en esa década (aprox)
        filterStr += `?artist dbo:activeYearsStartYear ?startYear . FILTER (?startYear >= ${
          filters.decade
        } && ?startYear < ${parseInt(filters.decade) + 10})\n`
      }
      if (filters.artistType) {
        if (filters.artistType === "band") {
          filterStr += `?artist dbo:bandMember ?member .\n`
        } else if (filters.artistType === "solo") {
          filterStr += `FILTER NOT EXISTS { ?artist dbo:bandMember ?member }\n`
        }
      }
      // NOTA: country y composer requieren mapeo extra
      const dbpediaQuery = `
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
      const response = await this.queryWithEndpoint(dbpediaQuery, endpoint)
      return this.processArtistResults(response, true)
    }

    // Wikidata por defecto
    let filterStr = ""
    let typeBlock = ""
    if (filters.artistType === "band") {
      typeBlock = `?artist wdt:P31 wd:Q215380 .` // grupo musical
    } else if (filters.artistType === "solo") {
      typeBlock = `?artist wdt:P31 wd:Q5 . ?artist wdt:P106 wd:Q639669 .` // persona músico
    } else {
      typeBlock = `{
        ?artist wdt:P31 wd:Q215380 .
      } UNION {
        ?artist wdt:P31 wd:Q5 . ?artist wdt:P106 wd:Q639669 .
      }`
    }
    if (name?.trim()) {
      filterStr += `?artist rdfs:label ?artistLabel . FILTER(CONTAINS(LCASE(?artistLabel), LCASE(\"${name}\")))\n`
    } else {
      filterStr += `?artist rdfs:label ?artistLabel .\n`
    }
    if (filters.genre) {
      filterStr += `?artist wdt:P136 wd:${filters.genre} .\n`
    }
    if (filters.decade) {
      // Buscar artistas activos en esa década (aprox)
      filterStr += `OPTIONAL { ?artist wdt:P571 ?formationDate } FILTER (YEAR(?formationDate) >= ${
        filters.decade
      } && YEAR(?formationDate) < ${parseInt(filters.decade) + 10})\n`
    }
    // NOTA: country y composer requieren mapeo extra
    const bandQuery = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>
      
      SELECT DISTINCT ?artist ?artistLabel ?mbid ?birthDate ?country ?countryLabel ?genre ?genreLabel ?instrument ?instrumentLabel ?image
      WHERE {
        ${typeBlock}
        ${filterStr}
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
      ORDER BY ?artistLabel
      LIMIT 30
    `
    const response = await this.queryWithEndpoint(bandQuery, endpoint)
    return this.processArtistResults(response)
  }

  async getArtistDiscography(
    artistId: string,
    mbid?: string,
    endpoint?: string
  ): Promise<AlbumInfo[]> {
    // Si el endpoint es DBpedia, usar query alternativo
    if (endpoint && endpoint.includes("dbpedia")) {
      // Se asume que artistId es la URI completa de DBpedia
      const dbpediaQuery = `
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
      const response = await this.queryWithEndpoint(dbpediaQuery, endpoint)
      return this.processAlbumResults(response, true)
    }

    // Wikidata por defecto
    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>
      
      SELECT DISTINCT ?album ?albumLabel ?releaseDate ?label ?labelLabel
      WHERE {
        ?album wdt:P31/wdt:P279* wd:Q482994 ;  # álbum de estudio o cualquier tipo de álbum
               wdt:P175 wd:${artistId} .        # intérprete
        
        OPTIONAL { ?album wdt:P577 ?releaseDate }  # fecha de publicación
        OPTIONAL { ?album wdt:P264 ?label }        # discográfica
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      ORDER BY ?releaseDate
      LIMIT 50
    `
    const response = await this.queryWithEndpoint(query, endpoint)
    const wikidataAlbums = this.processAlbumResults(response)

    // Si la discografía de Wikidata es vacía y hay MBID, buscar en MusicBrainz
    if (wikidataAlbums.length === 0 && mbid) {
      console.log(
        "No se encontraron álbumes en Wikidata, buscando en MusicBrainz..."
      )
      try {
        const mbAlbums = await fetchDiscographyFromMusicBrainz(mbid)
        return mbAlbums
      } catch (err) {
        console.error("Error al obtener discografía de MusicBrainz:", err)
      }
    }
    return wikidataAlbums
  }

  async getArtistInfluences(
    artistId: string,
    endpoint?: string
  ): Promise<ArtistInfo[]> {
    // Si el endpoint es DBpedia, usar query alternativo
    if (endpoint && endpoint.includes("dbpedia")) {
      const dbpediaQuery = `
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
      const response = await this.queryWithEndpoint(dbpediaQuery, endpoint)
      return this.processArtistResults(response, true)
    }

    // Wikidata por defecto
    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>
      
      SELECT DISTINCT ?influence ?influenceLabel ?birthDate ?country ?countryLabel ?genre ?genreLabel ?image
      WHERE {
        wd:${artistId} wdt:P737 ?influence .  # influenciado por
        
        OPTIONAL { ?influence wdt:P569 ?birthDate }  # fecha nacimiento
        OPTIONAL { ?influence wdt:P571 ?birthDate }  # fecha formación
        OPTIONAL { ?influence wdt:P27 ?country }     # país ciudadanía  
        OPTIONAL { ?influence wdt:P495 ?country }    # país origen
        OPTIONAL { ?influence wdt:P136 ?genre }      # género
        OPTIONAL { ?influence wdt:P18 ?image }       # imagen
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      LIMIT 20
    `
    const response = await this.queryWithEndpoint(query, endpoint)
    return this.processArtistResults(response)
  }

  async getCollaborations(
    artistId: string,
    endpoint?: string
  ): Promise<CollaborationInfo[]> {
    // Si el endpoint es DBpedia, usar query alternativo
    if (endpoint && endpoint.includes("dbpedia")) {
      const dbpediaQuery = `
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
      const response = await this.queryWithEndpoint(dbpediaQuery, endpoint)
      return this.processCollaborationResults(response, true)
    }

    // Wikidata por defecto
    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>
      
      SELECT DISTINCT ?song ?songLabel ?collaborator ?collaboratorLabel ?releaseDate
      WHERE {
        ?song wdt:P31/wdt:P279* wd:Q7366 ;      # canción o composición musical
              wdt:P175 wd:${artistId} ;          # intérprete principal
              wdt:P175 ?collaborator .           # otro intérprete (colaborador)
        
        FILTER(?collaborator != wd:${artistId})  # excluir al mismo artista
        
        OPTIONAL { ?song wdt:P577 ?releaseDate } # fecha de lanzamiento
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      ORDER BY DESC(?releaseDate)
      LIMIT 30
    `
    const response = await this.queryWithEndpoint(query, endpoint)
    return this.processCollaborationResults(response)
  }

  async searchByGenre(genreId: string): Promise<ArtistInfo[]> {
    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>
      
      SELECT DISTINCT ?artist ?artistLabel ?country ?countryLabel ?formationDate
      WHERE {
        # Artistas conocidos del género especificado
        {
          ?artist wdt:P31 wd:Q215380 .  # grupo musical
          ?artist wdt:P136 wd:${genreId} .
        }
        UNION
        {
          ?artist wdt:P31 wd:Q5 .       # persona
          ?artist wdt:P106 wd:Q639669 . # músico  
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

    const response = await this.query(query)
    return this.processArtistResults(response)
  }

  // Nueva función para buscar artistas populares
  async getPopularArtists(): Promise<ArtistInfo[]> {
    // Usar artistas conocidos en lugar de filtros complejos
    return this.getTopBands()
  }

  // Nueva función para buscar por nombre más flexible
  async searchArtistFlexible(name: string): Promise<ArtistInfo[]> {
    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      
      SELECT DISTINCT ?artist ?artistLabel ?mbid ?birthDate ?country ?countryLabel ?genre ?genreLabel ?instrument ?instrumentLabel ?image
      WHERE {
        ?artist wdt:P106 wd:Q639669 .
        {
          ?artist rdfs:label ?artistLabel .
          FILTER(CONTAINS(LCASE(?artistLabel), LCASE("${name}")))
        }
        OPTIONAL { ?artist wdt:P434 ?mbid } # MusicBrainz ID
        OPTIONAL { ?artist wdt:P569 ?birthDate }
        OPTIONAL { ?artist wdt:P27 ?country }
        OPTIONAL { ?artist wdt:P136 ?genre }
        OPTIONAL { ?artist wdt:P1303 ?instrument }
        OPTIONAL { ?artist wdt:P18 ?image }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      LIMIT 10
    `

    const response = await this.query(query)
    return this.processArtistResults(response)
  }

  private processArtistResults(
    response: SparqlResponse,
    isDbpedia = false
  ): ArtistInfo[] {
    const artists = new Map<string, ArtistInfo>()
    response.results.bindings.forEach((binding) => {
      const artistId = isDbpedia
        ? binding.artist?.value // URI completa
        : binding.artist?.value.split("/").pop() || ""
      if (!artists.has(artistId)) {
        artists.set(artistId, {
          id: artistId,
          name: binding.artistLabel?.value || "",
          mbid: binding.mbid?.value, // Solo Wikidata
          birthDate: binding.birthDate?.value,
          country: binding.countryLabel?.value,
          genres: [],
          instruments: [],
          image: binding.image?.value,
        })
      }
      const artist = artists.get(artistId)!
      if (
        binding.genreLabel?.value &&
        !artist.genres.includes(binding.genreLabel.value)
      ) {
        artist.genres.push(binding.genreLabel.value)
      }
      if (
        binding.instrumentLabel?.value &&
        !artist.instruments.includes(binding.instrumentLabel.value)
      ) {
        artist.instruments.push(binding.instrumentLabel.value)
      }
    })
    return Array.from(artists.values())
  }
  private processAlbumResults(
    response: SparqlResponse,
    isDbpedia = false
  ): AlbumInfo[] {
    return response.results.bindings.map((binding) => ({
      id: isDbpedia
        ? binding.album?.value // URI completa
        : binding.album?.value?.split("/").pop() || "",
      title: binding.albumLabel?.value || "Sin título",
      releaseDate: binding.releaseDate?.value,
      label: binding.labelLabel?.value,
      genre: binding.genreLabel?.value, // Solo DBpedia
    }))
  }
  private processCollaborationResults(
    response: SparqlResponse,
    isDbpedia = false
  ): CollaborationInfo[] {
    return response.results.bindings.map((binding) => ({
      song: binding.songLabel?.value || "Sin título",
      artist1: "", // Este será el artista principal (se puede omitir)
      artist2: binding.collaboratorLabel?.value || "Colaborador desconocido",
      releaseDate: binding.releaseDate?.value,
    }))
  }

  clearCache(): void {
    this.cache.clear()
  }

  // Función de debug para probar conectividad básica
  async testConnection(): Promise<TestConnectionResult> {
    try {
      const simpleQuery = `
        PREFIX wd: <http://www.wikidata.org/entity/>
        PREFIX wdt: <http://www.wikidata.org/prop/direct/>
        PREFIX wikibase: <http://wikiba.se/ontology#>
        PREFIX bd: <http://www.bigdata.com/rdf#>
        
        SELECT ?artist ?artistLabel WHERE {
          ?artist wdt:P31 wd:Q215380 .  # grupo musical
          SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
        }
        LIMIT 3
      `

      const response = await this.query(simpleQuery)

      if (response.results.bindings.length > 0) {
        return {
          success: true,
          message: `Conexión exitosa. Encontrados ${response.results.bindings.length} resultados.`,
          sampleData: response.results.bindings,
        }
      } else {
        return {
          success: false,
          message: "Conexión establecida pero sin resultados.",
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Error de conexión: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      }
    }
  }

  // Función para buscar un artista específico conocido (para testing)
  async searchBeatles(): Promise<ArtistInfo[]> {
    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>
      
      SELECT DISTINCT ?artist ?artistLabel ?birthDate ?country ?countryLabel ?genre ?genreLabel ?image
      WHERE {
        # Buscar específicamente The Beatles (ID conocido: Q1299)
        VALUES ?artist { wd:Q1299 }
        
        OPTIONAL { ?artist wdt:P571 ?birthDate }  # fecha de formación
        OPTIONAL { ?artist wdt:P495 ?country }    # país de origen
        OPTIONAL { ?artist wdt:P136 ?genre }      # género
        OPTIONAL { ?artist wdt:P18 ?image }       # imagen
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
    `

    const response = await this.query(query)
    return this.processArtistResults(response)
  }

  // Consulta ultra simple para verificar conectividad
  async testSimpleQuery(): Promise<SparqlResponse> {
    const query = `
      SELECT ?item ?itemLabel WHERE {
        VALUES ?item { wd:Q1299 wd:Q2306 wd:Q1299 }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      LIMIT 3
    `

    return await this.query(query)
  }

  // Búsqueda de artistas famosos sin filtros complejos
  async getTopBands(): Promise<ArtistInfo[]> {
    const query = `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>
      
      SELECT DISTINCT ?artist ?artistLabel ?country ?countryLabel ?genre ?genreLabel ?image
      WHERE {
        VALUES ?artist { 
          wd:Q1299    # The Beatles
          wd:Q2306    # Pink Floyd  
          wd:Q5384    # Queen
          wd:Q1321    # Elvis Presley
          wd:Q392     # Bob Dylan
        }
        
        OPTIONAL { ?artist wdt:P495 ?country }
        OPTIONAL { ?artist wdt:P27 ?country }  
        OPTIONAL { ?artist wdt:P136 ?genre }
        OPTIONAL { ?artist wdt:P18 ?image }
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
    `

    const response = await this.query(query)
    return this.processArtistResults(response)
  }

  // Permite usar endpoint dinámico
  private async queryWithEndpoint(
    query: string,
    endpoint?: string
  ): Promise<SparqlResponse> {
    if (!endpoint || endpoint === this.endpoint) {
      return this.query(query)
    }
    // No usar caché para endpoints alternativos
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/sparql-query",
          Accept: "application/sparql-results+json",
          "User-Agent": "MusiGraph/1.0 (https://musigraph.app)",
        },
        body: query,
      })
      if (!response.ok) {
        throw new Error(`SPARQL query failed: ${response.statusText}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error("SPARQL query error (custom endpoint):", error)
      throw error
    }
  }

  // Método para limpiar caché de búsquedas específicas
  private clearSearchCache(searchTerm: string): void {
    console.log("Clearing search cache for term:", searchTerm)
    // Limpiar todo el caché por simplicidad
    // En una implementación más sofisticada, podrías limpiar solo las consultas relacionadas
    this.cache.clear()
  }
}

export const sparqlService = new SparqlService()
export type { ArtistInfo, AlbumInfo, CollaborationInfo }
