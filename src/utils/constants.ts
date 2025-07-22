// Wikidata Entity IDs
export const WIKIDATA_ENTITIES = {
  // Artist Types
  HUMAN: "Q5",
  MUSICAL_GROUP: "Q215380",
  MUSICIAN: "Q639669",
  COMPOSER: "Q36834",

  // Music Types
  ALBUM: "Q482994",
  SONG: "Q7366",

  // Genres
  ROCK: "Q11399",
  JAZZ: "Q8341",
  POP: "Q37073",
  HIP_HOP: "Q16917",
  ELECTRONIC: "Q9839",
  CLASSICAL: "Q9730",
  BLUES: "Q9759",
  COUNTRY: "Q1057",
  REGGAE: "Q11405",
  PUNK: "Q11424",
  METAL: "Q11426",
  FOLK: "Q1307808",
  R_AND_B: "Q45981",
  SOUL: "Q45981",
  FUNK: "Q1225",
  DISCO: "Q1225",

  // Properties
  INSTANCE_OF: "P31",
  OCCUPATION: "P106",
  BIRTH_DATE: "P569",
  FORMATION_DATE: "P571",
  GENRE: "P136",
  INSTRUMENT: "P1303",
  INFLUENCED_BY: "P737",
  PERFORMER: "P175",
  RELEASE_DATE: "P577",
  RECORD_LABEL: "P264",
  IMAGE: "P18",
  ORIGIN_COUNTRY: "P495",
} as const

// Search Filters
export const SEARCH_FILTERS = {
  ARTIST_TYPES: [
    { value: "solo", label: "Solista" },
    { value: "band", label: "Banda" },
    { value: "composer", label: "Compositor" },
  ],

  DECADES: [
    { value: "1950", label: "1950s" },
    { value: "1960", label: "1960s" },
    { value: "1970", label: "1970s" },
    { value: "1980", label: "1980s" },
    { value: "1990", label: "1990s" },
    { value: "2000", label: "2000s" },
    { value: "2010", label: "2010s" },
    { value: "2020", label: "2020s" },
  ],

  GENRES: [
    { value: WIKIDATA_ENTITIES.ROCK, label: "Rock" },
    { value: WIKIDATA_ENTITIES.JAZZ, label: "Jazz" },
    { value: WIKIDATA_ENTITIES.POP, label: "Pop" },
    { value: WIKIDATA_ENTITIES.HIP_HOP, label: "Hip Hop" },
    { value: WIKIDATA_ENTITIES.ELECTRONIC, label: "Electrónica" },
    { value: WIKIDATA_ENTITIES.CLASSICAL, label: "Clásica" },
    { value: WIKIDATA_ENTITIES.BLUES, label: "Blues" },
    { value: WIKIDATA_ENTITIES.COUNTRY, label: "Country" },
    { value: WIKIDATA_ENTITIES.REGGAE, label: "Reggae" },
    { value: WIKIDATA_ENTITIES.PUNK, label: "Punk" },
    { value: WIKIDATA_ENTITIES.METAL, label: "Metal" },
    { value: WIKIDATA_ENTITIES.FOLK, label: "Folk" },
  ],
} as const

// API Configuration
export const API_CONFIG = {
  WIKIDATA_ENDPOINT: "https://query.wikidata.org/sparql",
  TIMEOUT: 30000, // 30 seconds
  CACHE_DURATION: 3600000, // 1 hour
  MAX_RESULTS: 100,
  DEFAULT_LIMIT: 20,
} as const

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  LOADING_TIMEOUT: 10000,
  MAX_SEARCH_HISTORY: 10,
  NETWORK_GRAPH_CONFIG: {
    nodeSize: 20,
    linkDistance: 100,
    charge: -300,
    gravity: 0.1,
  },
} as const

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Error de conexión. Verifica tu internet e intenta de nuevo.",
  TIMEOUT_ERROR:
    "La consulta tardó demasiado. Intenta con términos más específicos.",
  NOT_FOUND: "No se encontraron resultados para tu búsqueda.",
  INVALID_QUERY: "Consulta inválida. Verifica los términos de búsqueda.",
  RATE_LIMIT:
    "Demasiadas consultas. Espera un momento antes de intentar de nuevo.",
  UNKNOWN_ERROR: "Error inesperado. Intenta de nuevo más tarde.",
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  SEARCH_COMPLETE: "Búsqueda completada exitosamente.",
  DATA_LOADED: "Datos cargados correctamente.",
  CACHE_UPDATED: "Cache actualizado.",
} as const

// Navigation Routes
export const ROUTES = {
  HOME: "/",
  SEARCH: "/search",
  ARTIST: "/artist/[id]",
  GENRE: "/genre/[id]",
  DECADE: "/decade/[year]",
  CONNECTIONS: "/connections",
  ABOUT: "/about",
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  SEARCH_HISTORY: "musigraph_search_history",
  USER_PREFERENCES: "musigraph_user_preferences",
  CACHE_DATA: "musigraph_cache_data",
} as const

// Default Values
export const DEFAULTS = {
  SEARCH_PLACEHOLDER: "Busca artistas, canciones, álbumes...",
  LOADING_TEXT: "Explorando el universo musical...",
  NO_RESULTS_TEXT: "No se encontraron resultados",
  ERROR_FALLBACK_TEXT: "Algo salió mal",
} as const
