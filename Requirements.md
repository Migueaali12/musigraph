# MusiGraph - Explorador Musical Semántico

## 1. Contexto del Proyecto

### Nombre de la aplicación
**MusiGraph**

### Descripción
MusiGraph es una aplicación web que permite a los usuarios explorar el universo musical a través de datos semánticos conectados. La aplicación consulta información en tiempo real desde bases de datos RDF para visualizar relaciones complejas entre artistas, álbumes, géneros musicales, influencias artísticas y colaboraciones. Los usuarios pueden descubrir conexiones ocultas en la música, explorar la evolución de géneros musicales y mapear las influencias entre artistas de diferentes épocas.

### Objetivos Principales
- Facilitar la exploración de datos musicales interconectados
- Visualizar relaciones entre artistas, géneros y movimientos musicales
- Proporcionar insights sobre influencias y colaboraciones musicales
- Crear una experiencia educativa y de descubrimiento musical
- Demostrar el poder de los datos semánticos en el dominio musical

## 1.1 Identidad Visual y Diseño

### Logo de la Aplicación
- **Archivo**: `public/musigraph-logo-vector.svg`
- **Formato**: Vector SVG para escalabilidad
- **Uso**: Header, favicon, y elementos de marca

### Tipografía
- **Fuente Principal**: Inter
- **Ubicación**: `public/fonts/Inter/`
- **Variantes**: Variable font con pesos del 100 al 900
- **Implementación**: CSS `font-family: 'Inter', sans-serif;`

### Paleta de Colores

#### Colores Primarios
- **Coral Vibrant**: `#ff6b6b` - Color principal de acción y elementos destacados
- **Turquoise Musical**: `#4ecdc4` - Color secundario para elementos interactivos
- **Blue Harmonic**: `#45b7d1` - Color terciario para información y datos

#### Colores Secundarios
- **Green Melodic**: `#96ceb4` - Color para elementos de éxito y confirmación
- **Gold Rhythmic**: `#ffeaa7` - Color para elementos de advertencia y destacados
- **Pink Symphonic**: `#fd79a8` - Color para elementos especiales y premium

#### Fondos y Neutros
- **Deep Night**: `#0f0f23` - Fondo principal oscuro
- **Soft Midnight**: `#1a1a2e` - Fondo secundario y contenedores
- **Acoustic Gray**: `#2d3748` - Color neutro para texto y bordes
- **Pure White**: `#ffffff` - Texto principal sobre fondos oscuros

#### Gradientes
- **Gradient Energy**: `linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)` - Para elementos de alta energía
- **Gradient Ocean**: `linear-gradient(135deg, #45b7d1 0%, #96ceb4 100%)` - Para elementos de calma y datos
- **Gradient Sunrise**: `linear-gradient(135deg, #fd79a8 0%, #ffeaa7 100%)` - Para elementos especiales

### Implementación CSS
```css
:root {
  /* Colores Primarios */
  --coral-vibrant: #ff6b6b;
  --turquoise-musical: #4ecdc4;
  --blue-harmonic: #45b7d1;
  
  /* Colores Secundarios */
  --green-melodic: #96ceb4;
  --gold-rhythmic: #ffeaa7;
  --pink-symphonic: #fd79a8;
  
  /* Fondos y Neutros */
  --deep-night: #0f0f23;
  --soft-midnight: #1a1a2e;
  --acoustic-gray: #2d3748;
  --pure-white: #ffffff;
  
  /* Gradientes */
  --gradient-energy: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%);
  --gradient-ocean: linear-gradient(135deg, #45b7d1 0%, #96ceb4 100%);
  --gradient-sunrise: linear-gradient(135deg, #fd79a8 0%, #ffeaa7 100%);
}
```

## 2. Selección del Store RDF

### Fuente de Datos Principal
**Wikidata** - `https://query.wikidata.org/sparql`

#### Justificación
- Amplia cobertura de datos musicales estructurados
- Información actualizada constantemente por la comunidad
- Soporte multiidioma (español, inglés)
- API SPARQL robusta y bien documentada
- Datos verificados y con referencias

#### Fuentes Alternativas (opcional)
- **DBpedia**: `https://dbpedia.org/sparql`
- **MusicBrainz RDF**: Para datos técnicos detallados
- **BBC Music**: Para datos adicionales de géneros

## 3. Consultas SPARQL Base

### 3.1 Búsqueda de Información Básica de Artista

```sparql
# Buscar información básica de un artista (ejemplo: "The Beatles")
SELECT ?artistaLabel ?fechaNacimiento ?paisOrigenLabel ?generoLabel ?instrumentoLabel
WHERE {
  ?artista wdt:P31 wd:Q5 ;                    # instancia de "persona"
          rdfs:label "The Beatles"@en ;
          wdt:P106 wd:Q639669 ;               # ocupación: músico
          wdt:P569 ?fechaNacimiento ;         # fecha de nacimiento
          wdt:P27 ?paisOrigen ;               # país de ciudadanía
          wdt:P136 ?genero ;                  # género musical
          wdt:P1303 ?instrumento .            # instrumento que toca
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
```

### 3.2 Explorar Discografía de un Artista

```sparql
# Buscar álbumes de un artista específico
SELECT ?albumLabel ?fechaPublicacion ?selloDiscograficoLabel ?generoLabel
WHERE {
  ?artista rdfs:label "Pink Floyd"@en ;
          wdt:P31 wd:Q215380 .               # instancia de "banda musical"
  
  ?album wdt:P31 wd:Q482994 ;                # instancia de "álbum"
         wdt:P175 ?artista ;                 # intérprete
         wdt:P577 ?fechaPublicacion ;        # fecha de publicación
         wdt:P264 ?selloDiscografico ;       # sello discográfico
         wdt:P136 ?genero .                  # género musical
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
ORDER BY ?fechaPublicacion
```

### 3.3 Buscar Colaboraciones entre Artistas

```sparql
# Encontrar colaboraciones musicales
SELECT ?cancionLabel ?artista1Label ?artista2Label ?fechaPublicacion
WHERE {
  ?cancion wdt:P31 wd:Q7366 ;                # instancia de "canción"
          wdt:P175 ?artista1 ;               # intérprete 1
          wdt:P175 ?artista2 ;               # intérprete 2
          wdt:P577 ?fechaPublicacion .       # fecha de publicación
  
  FILTER(?artista1 != ?artista2)             # asegurar que son artistas diferentes
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
ORDER BY DESC(?fechaPublicacion)
LIMIT 50
```

### 3.4 Explorar Influencias Musicales

```sparql
# Buscar influencias de un artista
SELECT ?artistaLabel ?influenciaLabel ?generoInfluenciaLabel
WHERE {
  ?artista rdfs:label "David Bowie"@en ;
          wdt:P737 ?influencia ;             # influenciado por
          wdt:P136 ?genero .                 # género del artista
  
  ?influencia wdt:P136 ?generoInfluencia .   # género de la influencia
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
```

### 3.5 Buscar Artistas por Género Musical

```sparql
# Buscar artistas de un género específico
SELECT ?artistaLabel ?paisOrigenLabel ?fechaFormacion
WHERE {
  ?artista wdt:P31/wdt:P279* wd:Q215380 ;    # instancia/subclase de "grupo musical"
          wdt:P136 wd:Q11399 ;               # género: rock
          wdt:P495 ?paisOrigen ;             # país de origen
          wdt:P571 ?fechaFormacion .         # fecha de formación
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
ORDER BY ?fechaFormacion
LIMIT 100
```

## 4. Prototipo de Aplicación Web

### 4.1 Stack Tecnológico Recomendado
- **Frontend**: Next.js 14 + TypeScript
- **Styling**: TailwindCSS + Shadcn/ui
- **Visualización**: Recharts + D3.js (para grafos de red)
- **Estado**: Zustand o React Context
- **Consultas**: Fetch API con cache
- **Deployment**: Vercel

### 4.2 Flujo Principal de la Aplicación

#### Input del Usuario
- Campo de búsqueda principal (nombre de artista/banda)
- Filtros avanzados:
  - Género musical
  - Década/Año
  - País de origen
  - Tipo (solista/banda/compositor)

#### Procesamiento Backend
1. Recepción de query del usuario
2. Construcción dinámica de consulta SPARQL
3. Envío de consulta a endpoint Wikidata
4. Procesamiento y limpieza de resultados
5. Estructuración de datos para frontend

#### Visualización de Resultados
**Información Básica del Artista:**
- Nombre completo
- Fecha de nacimiento/formación
- País de origen
- Género(s) musical(es)
- Instrumentos principales
- Foto/imagen (si disponible)

**Discografía:**
- Lista de álbumes con fechas
- Sellos discográficos
- Gráfico temporal de lanzamientos

**Red de Influencias:**
- Grafo interactivo de influencias
- Conexiones bidireccionales (influye/influenciado por)
- Visualización por géneros

**Colaboraciones:**
- Lista de colaboraciones destacadas
- Red de colaboradores frecuentes
- Timeline de colaboraciones

## 5. Funcionalidades Avanzadas

### 5.1 Tipos de Búsqueda Disponibles

#### Búsqueda por Artista
- Información completa del artista seleccionado
- Discografía detallada
- Red de influencias y colaboradores

#### Búsqueda por Género
- Artistas representativos del género
- Evolución temporal del género
- Subgéneros relacionados
- Mapa geográfico de origen

#### Búsqueda por Década
- Artistas más influyentes por periodo
- Géneros dominantes por época
- Eventos musicales importantes

#### Explorador de Conexiones
- "Grados de separación" entre artistas
- Caminos de influencia musical
- Redes de colaboración

#### Búsqueda por País/Región
- Escena musical por región
- Artistas internacionales vs. locales
- Influencias culturales en la música

### 5.2 Visualizaciones Interactivas

#### Dashboard Principal
- Métricas globales de la base de datos musical
- Artistas más conectados
- Géneros en tendencia (por consultas)

#### Grafo de Red Musical
- Nodos: Artistas, álbumes, géneros
- Aristas: Influencias, colaboraciones, similitudes
- Interactividad: zoom, filtros, búsqueda

#### Línea Temporal Musical
- Evolución de géneros musicales
- Hitos importantes en la música
- Correlación entre eventos históricos y música

#### Mapas Geográficos
- Origen geográfico de movimientos musicales
- Rutas de influencia musical mundial
- Concentración de artistas por región

## 6. Arquitectura del Sistema

### 6.1 Componentes Frontend
```
components/
├── search/
│   ├── SearchBar.tsx
│   ├── FilterPanel.tsx
│   └── SearchResults.tsx
├── artist/
│   ├── ArtistCard.tsx
│   ├── ArtistProfile.tsx
│   └── DiscographyView.tsx
├── visualization/
│   ├── NetworkGraph.tsx
│   ├── Timeline.tsx
│   └── GeographicMap.tsx
└── common/
    ├── Loading.tsx
    ├── ErrorBoundary.tsx
    └── Layout.tsx
```

### 6.2 Servicios Backend
```
services/
├── sparqlService.ts      # Conexión con Wikidata
├── queryBuilder.ts       # Construcción dinámica de consultas
├── dataProcessor.ts      # Procesamiento de resultados
└── cacheService.ts       # Cache de consultas frecuentes
```

### 6.3 Utilities y Helpers
```
utils/
├── sparqlQueries.ts      # Consultas SPARQL predefinidas
├── dataTransformers.ts   # Transformación de datos
├── networkAnalysis.ts    # Análisis de redes musicales
└── constants.ts          # Constantes y configuración
```

## 7. Casos de Uso Específicos

### 7.1 Caso de Uso 1: Explorar Influencias de The Beatles
1. Usuario busca "The Beatles"
2. Sistema muestra perfil básico de la banda
3. Usuario hace clic en "Ver Influencias"
4. Se despliega grafo con Chuck Berry, Elvis Presley, Little Richard
5. Usuario puede explorar recursivamente las influencias

### 7.2 Caso de Uso 2: Descubrir Evolución del Rock
1. Usuario selecciona género "Rock"
2. Sistema genera timeline desde 1950-2020
3. Muestra subgéneros emergentes por década
4. Usuario puede hacer zoom en periodo específico
5. Visualiza artistas clave y álbumes influyentes

### 7.3 Caso de Uso 3: Mapear Colaboraciones de un Artista
1. Usuario busca "Johnny Cash"
2. Selecciona pestaña "Colaboraciones"
3. Sistema muestra red de colaboradores
4. Destacar colaboraciones con June Carter, Bob Dylan
5. Permite explorar las carreras de los colaboradores

## 8. Métricas de Éxito

### 8.1 Métricas Técnicas
- Tiempo de respuesta < 3 segundos
- Disponibilidad > 99%
- Cobertura de datos > 10,000 artistas
- Precisión de consultas > 95%

### 8.2 Métricas de Usuario
- Tiempo promedio de sesión > 5 minutos
- Número de consultas por sesión > 3
- Tasa de rebote < 40%
- Satisfacción de usuario > 4/5

## 9. Consideraciones Técnicas

### 9.1 Optimización
- Cache de consultas SPARQL frecuentes
- Paginación de resultados grandes
- Lazy loading para componentes pesados
- Optimización de consultas complejas

### 9.2 Manejo de Errores
- Timeout de consultas SPARQL (30s)
- Fallback para datos faltantes
- Mensajes de error informativos
- Modo offline básico

### 9.3 Escalabilidad
- Rate limiting para consultas
- CDN para recursos estáticos
- Monitoreo de performance
- Analytics de uso

## 10. Fases de Desarrollo

### Fase 1: MVP (2 semanas)
- Búsqueda básica de artistas
- Información fundamental
- Interface simple

### Fase 2: Visualizaciones (2 semanas)
- Grafo de influencias
- Timeline de discografía
- Mejoras de UX

### Fase 3: Funcionalidades Avanzadas (2 semanas)
- Múltiples tipos de búsqueda
- Filtros avanzados
- Optimizaciones

### Fase 4: Polish y Deploy (1 semana)
- Testing exhaustivo
- Optimización de performance
- Deployment en producción

---

## Recursos Adicionales

### Enlaces Útiles
- [Wikidata Query Service](https://query.wikidata.org/)
- [SPARQL Tutorial](https://www.w3.org/TR/sparql11-query/)
- [Wikidata Music Properties](https://www.wikidata.org/wiki/Wikidata:WikiProject_Music)

### Ejemplos de Consulta para Testear
- The Beatles: `wd:Q1299`
- Pink Floyd: `wd:Q2306`
- Bob Dylan: `wd:Q392`
- Rock music: `wd:Q11399`
- Jazz: `wd:Q8341`