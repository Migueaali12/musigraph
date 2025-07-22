interface SearchFilters {
  name?: string
  genre?: string
  decade?: string
  country?: string
  artistType?: "solo" | "band" | "composer"
}

interface QueryOptions {
  limit?: number
  offset?: number
  sortBy?: "name" | "date" | "popularity"
  order?: "asc" | "desc"
}

class QueryBuilder {
  private basePrefixes = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  `

  buildArtistSearchQuery(
    filters: SearchFilters,
    options: QueryOptions = {}
  ): string {
    const { name, genre, decade, country, artistType } = filters
    const { limit = 20, sortBy = "name", order = "asc" } = options

    let query =
      this.basePrefixes +
      `
      SELECT DISTINCT ?artist ?artistLabel ?birthDate ?country ?countryLabel ?genre ?genreLabel ?image
      WHERE {
    `

    // Base artist filter
    query += `
        ?artist wdt:P31 wd:Q5 ;
               wdt:P106 wd:Q639669 .
    `

    // Name filter
    if (name) {
      query += `
        ?artist rdfs:label "${name}"@en .
      `
    }

    // Genre filter
    if (genre) {
      query += `
        ?artist wdt:P136 wd:${genre} .
      `
    }

    // Country filter
    if (country) {
      query += `
        ?artist wdt:P27 wd:${country} .
      `
    }

    // Artist type filter
    if (artistType) {
      switch (artistType) {
        case "solo":
          query += `
            ?artist wdt:P31 wd:Q5 .
            FILTER NOT EXISTS { ?artist wdt:P31 wd:Q215380 }
          `
          break
        case "band":
          query += `
            ?artist wdt:P31 wd:Q215380 .
          `
          break
        case "composer":
          query += `
            ?artist wdt:P106 wd:Q36834 .
          `
          break
      }
    }

    // Decade filter
    if (decade) {
      const startYear = parseInt(decade)
      const endYear = startYear + 9
      query += `
        ?artist wdt:P569 ?birthDate .
        FILTER(YEAR(?birthDate) >= ${startYear} && YEAR(?birthDate) <= ${endYear})
      `
    }

    // Optional properties
    query += `
        OPTIONAL { ?artist wdt:P569 ?birthDate }
        OPTIONAL { ?artist wdt:P27 ?country }
        OPTIONAL { ?artist wdt:P136 ?genre }
        OPTIONAL { ?artist wdt:P18 ?image }
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
    `

    // Sorting
    const sortField = sortBy === "date" ? "?birthDate" : "?artistLabel"
    query += `
      ORDER BY ${order.toUpperCase()}(${sortField})
      LIMIT ${limit}
    `

    return query
  }

  buildGenreExplorationQuery(
    genreId: string,
    options: QueryOptions = {}
  ): string {
    const { limit = 50 } = options

    return (
      this.basePrefixes +
      `
      SELECT ?artist ?artistLabel ?country ?countryLabel ?formationDate ?subgenre ?subgenreLabel
      WHERE {
        ?artist wdt:P31/wdt:P279* wd:Q215380 ;
               wdt:P136 wd:${genreId} .
        
        OPTIONAL { ?artist wdt:P495 ?country }
        OPTIONAL { ?artist wdt:P571 ?formationDate }
        OPTIONAL { ?artist wdt:P136 ?subgenre }
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      ORDER BY ?formationDate
      LIMIT ${limit}
    `
    )
  }

  buildDecadeTimelineQuery(decade: string): string {
    const startYear = parseInt(decade)
    const endYear = startYear + 9

    return (
      this.basePrefixes +
      `
      SELECT ?artist ?artistLabel ?genre ?genreLabel ?event ?eventLabel ?date
      WHERE {
        {
          ?artist wdt:P31 wd:Q5 ;
                 wdt:P106 wd:Q639669 ;
                 wdt:P569 ?date .
          FILTER(YEAR(?date) >= ${startYear} && YEAR(?date) <= ${endYear})
        }
        UNION
        {
          ?artist wdt:P31 wd:Q215380 ;
                 wdt:P571 ?date .
          FILTER(YEAR(?date) >= ${startYear} && YEAR(?date) <= ${endYear})
        }
        
        OPTIONAL { ?artist wdt:P136 ?genre }
        OPTIONAL { ?event wdt:P585 ?date }
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      ORDER BY ?date
    `
    )
  }

  buildInfluenceNetworkQuery(artistId: string, depth: number = 2): string {
    return (
      this.basePrefixes +
      `
      SELECT ?influence ?influenceLabel ?influenced ?influencedLabel ?genre ?genreLabel
      WHERE {
        {
          wd:${artistId} wdt:P737 ?influence .
          ?influence wdt:P136 ?genre .
        }
        UNION
        {
          ?influenced wdt:P737 wd:${artistId} .
          ?influenced wdt:P136 ?genre .
        }
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      LIMIT 100
    `
    )
  }

  buildCollaborationNetworkQuery(artistId: string): string {
    return (
      this.basePrefixes +
      `
      SELECT ?collaborator ?collaboratorLabel ?song ?songLabel ?releaseDate
      WHERE {
        ?song wdt:P31 wd:Q7366 ;
              wdt:P175 wd:${artistId} ;
              wdt:P175 ?collaborator ;
              wdt:P577 ?releaseDate .
        
        FILTER(?collaborator != wd:${artistId})
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      ORDER BY DESC(?releaseDate)
      LIMIT 50
    `
    )
  }

  buildGeographicDistributionQuery(genreId?: string): string {
    let query =
      this.basePrefixes +
      `
      SELECT ?country ?countryLabel (COUNT(?artist) as ?artistCount)
      WHERE {
        ?artist wdt:P31 wd:Q5 ;
               wdt:P106 wd:Q639669 ;
               wdt:P27 ?country .
    `

    if (genreId) {
      query += `
        ?artist wdt:P136 wd:${genreId} .
      `
    }

    query += `
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      GROUP BY ?country ?countryLabel
      ORDER BY DESC(?artistCount)
      LIMIT 50
    `

    return query
  }

  buildPopularArtistsQuery(limit: number = 20): string {
    return (
      this.basePrefixes +
      `
      SELECT ?artist ?artistLabel (COUNT(?influence) as ?influenceCount)
      WHERE {
        ?artist wdt:P31 wd:Q5 ;
               wdt:P106 wd:Q639669 .
        ?influenced wdt:P737 ?artist .
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
      }
      GROUP BY ?artist ?artistLabel
      ORDER BY DESC(?influenceCount)
      LIMIT ${limit}
    `
    )
  }
}

export const queryBuilder = new QueryBuilder()
export type { SearchFilters, QueryOptions }
