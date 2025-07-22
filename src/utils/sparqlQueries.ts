import { WIKIDATA_ENTITIES } from "./constants"

// Base prefixes for all queries
const BASE_PREFIXES = `
  PREFIX wd: <http://www.wikidata.org/entity/>
  PREFIX wdt: <http://www.wikidata.org/prop/direct/>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
`

// 1. Búsqueda de Información Básica de Artista
export const ARTIST_BASIC_INFO_QUERY = (artistName: string) => `
  ${BASE_PREFIXES}
  SELECT ?artista ?artistaLabel ?fechaNacimiento ?paisOrigenLabel ?generoLabel ?instrumentoLabel ?imagen
  WHERE {
    ?artista wdt:P31 wd:Q5 ;
            rdfs:label "${artistName}"@en ;
            wdt:P106 wd:Q639669 ;
            wdt:P569 ?fechaNacimiento ;
            wdt:P27 ?paisOrigen ;
            wdt:P136 ?genero ;
            wdt:P1303 ?instrumento ;
            wdt:P18 ?imagen .
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  LIMIT 10
`

// 2. Explorar Discografía de un Artista
export const ARTIST_DISCOGRAPHY_QUERY = (artistId: string) => `
  ${BASE_PREFIXES}
  SELECT ?album ?albumLabel ?fechaPublicacion ?selloDiscograficoLabel ?generoLabel
  WHERE {
    wd:${artistId} wdt:P31 wd:Q215380 .
    
    ?album wdt:P31 wd:Q482994 ;
           wdt:P175 wd:${artistId} ;
           wdt:P577 ?fechaPublicacion ;
           wdt:P264 ?selloDiscografico ;
           wdt:P136 ?genero .
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  ORDER BY ?fechaPublicacion
`

// 3. Buscar Colaboraciones entre Artistas
export const COLLABORATIONS_QUERY = `
  ${BASE_PREFIXES}
  SELECT ?cancion ?cancionLabel ?artista1 ?artista1Label ?artista2 ?artista2Label ?fechaPublicacion
  WHERE {
    ?cancion wdt:P31 wd:Q7366 ;
            wdt:P175 ?artista1 ;
            wdt:P175 ?artista2 ;
            wdt:P577 ?fechaPublicacion .
    
    FILTER(?artista1 != ?artista2)
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  ORDER BY DESC(?fechaPublicacion)
  LIMIT 50
`

// 4. Explorar Influencias Musicales
export const INFLUENCES_QUERY = (artistName: string) => `
  ${BASE_PREFIXES}
  SELECT ?artista ?artistaLabel ?influencia ?influenciaLabel ?generoInfluencia ?generoInfluenciaLabel
  WHERE {
    ?artista rdfs:label "${artistName}"@en ;
            wdt:P737 ?influencia ;
            wdt:P136 ?genero .
    
    ?influencia wdt:P136 ?generoInfluencia .
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  LIMIT 20
`

// 5. Buscar Artistas por Género Musical
export const ARTISTS_BY_GENRE_QUERY = (genreId: string) => `
  ${BASE_PREFIXES}
  SELECT ?artista ?artistaLabel ?paisOrigenLabel ?fechaFormacion
  WHERE {
    ?artista wdt:P31/wdt:P279* wd:Q215380 ;
            wdt:P136 wd:${genreId} ;
            wdt:P495 ?paisOrigen ;
            wdt:P571 ?fechaFormacion .
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  ORDER BY ?fechaFormacion
  LIMIT 100
`

// 6. Búsqueda por Década
export const ARTISTS_BY_DECADE_QUERY = (decade: string) => {
  const startYear = parseInt(decade)
  const endYear = startYear + 9

  return `
    ${BASE_PREFIXES}
    SELECT ?artista ?artistaLabel ?genero ?generoLabel ?fechaNacimiento
    WHERE {
      ?artista wdt:P31 wd:Q5 ;
              wdt:P106 wd:Q639669 ;
              wdt:P569 ?fechaNacimiento ;
              wdt:P136 ?genero .
      
      FILTER(YEAR(?fechaNacimiento) >= ${startYear} && YEAR(?fechaNacimiento) <= ${endYear})
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    ORDER BY ?fechaNacimiento
    LIMIT 50
  `
}

// 7. Explorador de Conexiones (Grados de Separación)
export const CONNECTIONS_QUERY = (artistId1: string, artistId2: string) => `
  ${BASE_PREFIXES}
  SELECT ?path ?intermediate ?intermediateLabel
  WHERE {
    wd:${artistId1} wdt:P737 ?intermediate .
    ?intermediate wdt:P737 wd:${artistId2} .
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  LIMIT 10
`

// 8. Búsqueda por País/Región
export const ARTISTS_BY_COUNTRY_QUERY = (countryId: string) => `
  ${BASE_PREFIXES}
  SELECT ?artista ?artistaLabel ?genero ?generoLabel ?fechaFormacion
  WHERE {
    ?artista wdt:P31/wdt:P279* wd:Q215380 ;
            wdt:P495 wd:${countryId} ;
            wdt:P571 ?fechaFormacion ;
            wdt:P136 ?genero .
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  ORDER BY ?fechaFormacion
  LIMIT 100
`

// 9. Géneros Musicales Populares
export const POPULAR_GENRES_QUERY = `
  ${BASE_PREFIXES}
  SELECT ?genero ?generoLabel (COUNT(?artista) as ?artistaCount)
  WHERE {
    ?artista wdt:P31 wd:Q5 ;
            wdt:P106 wd:Q639669 ;
            wdt:P136 ?genero .
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  GROUP BY ?genero ?generoLabel
  ORDER BY DESC(?artistaCount)
  LIMIT 20
`

// 10. Artistas Más Influyentes
export const MOST_INFLUENTIAL_ARTISTS_QUERY = `
  ${BASE_PREFIXES}
  SELECT ?artista ?artistaLabel (COUNT(?influenciado) as ?influenciaCount)
  WHERE {
    ?artista wdt:P31 wd:Q5 ;
            wdt:P106 wd:Q639669 .
    ?influenciado wdt:P737 ?artista .
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  GROUP BY ?artista ?artistaLabel
  ORDER BY DESC(?influenciaCount)
  LIMIT 20
`

// 11. Timeline Musical por Década
export const MUSICAL_TIMELINE_QUERY = (decade: string) => {
  const startYear = parseInt(decade)
  const endYear = startYear + 9

  return `
    ${BASE_PREFIXES}
    SELECT ?evento ?eventoLabel ?fecha ?tipo
    WHERE {
      {
        ?evento wdt:P31 wd:Q482994 ;
                wdt:P577 ?fecha .
        FILTER(YEAR(?fecha) >= ${startYear} && YEAR(?fecha) <= ${endYear})
        BIND("album" as ?tipo)
      }
      UNION
      {
        ?evento wdt:P31 wd:Q7366 ;
                wdt:P577 ?fecha .
        FILTER(YEAR(?fecha) >= ${startYear} && YEAR(?fecha) <= ${endYear})
        BIND("song" as ?tipo)
      }
      UNION
      {
        ?evento wdt:P31 wd:Q215380 ;
                wdt:P571 ?fecha .
        FILTER(YEAR(?fecha) >= ${startYear} && YEAR(?fecha) <= ${endYear})
        BIND("band" as ?tipo)
      }
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    ORDER BY ?fecha
    LIMIT 100
  `
}

// 12. Distribución Geográfica de Géneros
export const GEOGRAPHIC_DISTRIBUTION_QUERY = (genreId?: string) => {
  let query = `
    ${BASE_PREFIXES}
    SELECT ?pais ?paisLabel (COUNT(?artista) as ?artistaCount)
    WHERE {
      ?artista wdt:P31 wd:Q5 ;
              wdt:P106 wd:Q639669 ;
              wdt:P27 ?pais .
  `

  if (genreId) {
    query += `
      ?artista wdt:P136 wd:${genreId} .
    `
  }

  query += `
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }
    GROUP BY ?pais ?paisLabel
    ORDER BY DESC(?artistaCount)
    LIMIT 50
  `

  return query
}

// 13. Subgéneros de un Género Principal
export const SUBGENRES_QUERY = (genreId: string) => `
  ${BASE_PREFIXES}
  SELECT ?subgenero ?subgeneroLabel (COUNT(?artista) as ?artistaCount)
  WHERE {
    ?artista wdt:P31 wd:Q5 ;
            wdt:P106 wd:Q639669 ;
            wdt:P136 ?subgenero .
    
    ?subgenero wdt:P279* wd:${genreId} .
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  GROUP BY ?subgenero ?subgeneroLabel
  ORDER BY DESC(?artistaCount)
  LIMIT 20
`

// 14. Colaboraciones Frecuentes
export const FREQUENT_COLLABORATIONS_QUERY = `
  ${BASE_PREFIXES}
  SELECT ?artista1 ?artista1Label ?artista2 ?artista2Label (COUNT(?cancion) as ?collaborationCount)
  WHERE {
    ?cancion wdt:P31 wd:Q7366 ;
            wdt:P175 ?artista1 ;
            wdt:P175 ?artista2 .
    
    FILTER(?artista1 != ?artista2)
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  GROUP BY ?artista1 ?artista1Label ?artista2 ?artista2Label
  HAVING(?collaborationCount > 1)
  ORDER BY DESC(?collaborationCount)
  LIMIT 50
`

// 15. Evolución de Géneros por Año
export const GENRE_EVOLUTION_QUERY = `
  ${BASE_PREFIXES}
  SELECT ?año ?genero ?generoLabel (COUNT(?artista) as ?artistaCount)
  WHERE {
    ?artista wdt:P31 wd:Q5 ;
            wdt:P106 wd:Q639669 ;
            wdt:P136 ?genero ;
            wdt:P569 ?fechaNacimiento .
    
    BIND(YEAR(?fechaNacimiento) as ?año)
    
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  }
  GROUP BY ?año ?genero ?generoLabel
  ORDER BY ?año DESC(?artistaCount)
  LIMIT 100
`
