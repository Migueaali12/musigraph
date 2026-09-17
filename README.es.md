<p align="center">
  🌐 <a href="README.md">English</a> | <strong>Español</strong>
</p>

<p align="center">
  <img src="public/musigraph-logo-vector.svg" alt="Logotipo de MusiGraph" width="120" height="110" />
</p>

<h1 align="center">MusiGraph</h1>

Semantic Music Explorer — descubre conexiones en la música a través de datos enlazados.

<p align="center">
  <a href="#caracteristicas">Características</a>
  &middot;
  <a href="#stack-tecnologico">Stack Tecnológico</a>
  &middot;
  <a href="#primeros-pasos">Primeros Pasos</a>
  &middot;
  <a href="#estructura-del-proyecto">Estructura del Proyecto</a>
  &middot;
  <a href="#fuente-de-datos">Fuente de Datos</a>
  &middot;
  <a href="#arquitectura">Arquitectura</a>
  &middot;
  <a href="#hoja-de-ruta">Hoja de Ruta</a>
</p>

---

## Resumen

MusiGraph es una aplicación web que explora el universo musical a través de la **visualización de datos semánticos**. Consulta información en tiempo real de **Wikidata** mediante **SPARQL** para revelar conexiones entre artistas, álbumes, géneros, influencias y colaboraciones que las herramientas de búsqueda tradicionales pasan por alto.

> [!NOTE]
> Este proyecto está actualmente en desarrollo activo (fase MVP). El foco está en construir una base sólida para la exploración musical semántica y la visualización de relaciones.

## Características

### Implementadas

- **Búsqueda de artistas** — Busca cualquier músico o banda y obtén información estructurada
- **Integración SPARQL** — Consultas directas al Wikidata Query Service a través de un proxy en la ruta API
- **Perfiles de artista** — Muestra datos biográficos, géneros, instrumentos y orígenes
- **Vista de artista por pestañas** — Pestañas de Resumen, Discografía, Influencias y Colaboraciones
- **Interfaz responsive** — Construida con Tailwind CSS para una experiencia consistente en todos los dispositivos
- **Internacionalización (i18n)** — Soporte de idiomas inglés y español mediante enrutado `[lang]`
- **Tema claro/oscuro** — Conmutador de tema con `next-themes` según la preferencia del usuario
- **Panel de filtros** — Filtros de búsqueda avanzados por género, década, país y tipo de artista
- **Límite de errores (Error Boundary)** — Manejo elegante de errores con interfaz de respaldo
- **Proxy de ruta API** — Ruta `/api/sparql` para gestionar las consultas SPARQL en el servidor

### Planificadas

- **Grafo de red de influencias** — Grafo interactivo dirigido por fuerza que muestra influencias musicales
- **Línea de tiempo de discografía** — Gráfico de línea temporal visual de los lanzamientos de álbumes
- **Explorador de colaboraciones** — Mapea colaboraciones y «grados de separación»
- **Evolución de géneros** — Rastrea cómo surgen y se ramifican los géneros a lo largo del tiempo
- **Mapeo geográfico** — Explora escenas musicales por región
- **Caché de consultas** — Caché para consultas SPARQL frecuentes y mejor rendimiento

## Stack Tecnológico

| Categoría       | Tecnología                          |
|-----------------|-------------------------------------|
| Framework       | [Next.js 15](https://nextjs.org/) (App Router) |
| Biblioteca UI   | [React 19](https://react.dev/)      |
| Lenguaje        | [TypeScript 5](https://www.typescriptlang.org/) |
| Estilos         | [Tailwind CSS 4](https://tailwindcss.com/) |
| Iconos          | [Lucide React](https://lucide.dev/) |
| Temas           | [next-themes](https://github.com/pacocoursey/next-themes) |
| Fuente de datos | [Wikidata SPARQL](https://query.wikidata.org/) |
| Gestor de paquetes | [pnpm](https://pnpm.io/)          |

## Primeros Pasos

### Requisitos previos

- [Node.js](https://nodejs.org/) 18+ (se recomienda LTS)
- [pnpm](https://pnpm.io/) (o npm/yarn)

### Instalación

```bash
# Clona el repositorio
git clone https://github.com/Migueaali12/musigraph.git
cd musigraph

# Instala las dependencias
pnpm install
```

### Desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Build de producción

```bash
pnpm build
pnpm start
```

### Linting

```bash
pnpm lint
```

## Estructura del Proyecto

```
musigraph/
├── src/
│   ├── app/                        # Páginas de Next.js App Router
│   │   ├── [lang]/                 # Rutas localizadas i18n
│   │   │   ├── layout.tsx          # Layout raíz localizado
│   │   │   ├── page.tsx            # Página de inicio (componente de servidor)
│   │   │   ├── error.tsx           # Límite de errores
│   │   │   ├── not-found.tsx       # Página 404
│   │   │   └── test/               # Página de prueba/experimento
│   │   ├── api/
│   │   │   └── sparql/
│   │   │       └── route.ts        # Proxy de la consulta API SPARQL
│   │   ├── globals.css             # Estilos globales
│   │   ├── favicon.ico
│   │   └── page-new.tsx            # Página de inicio alternativa
│   ├── components/
│   │   ├── artist/                 # Componentes relacionados con artistas
│   │   │   ├── ArtistProfile.tsx
│   │   │   └── tabs/
│   │   │       ├── OverviewTab.tsx
│   │   │       ├── DiscographyTab.tsx
│   │   │       ├── InfluencesTab.tsx
│   │   │       └── CollaborationsTab.tsx
│   │   ├── common/                 # Componentes de UI compartidos
│   │   │   ├── AppStats.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── WelcomeMessage.tsx
│   │   ├── home/
│   │   │   └── HomeClient.tsx      # Componente cliente de la página de inicio
│   │   ├── search/                 # Componentes relacionados con la búsqueda
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── SearchResults.tsx
│   │   └── Github.tsx              # Componente de enlace a GitHub
│   ├── dictionaries/               # Archivos de traducción i18n
│   │   ├── en.json
│   │   ├── es.json
│   │   └── getDictionary.ts
│   ├── services/                   # Servicios de datos y consultas
│   │   ├── sparqlService.ts        # Cliente SPARQL de Wikidata
│   │   ├── queryBuilder.ts         # Constructor dinámico de consultas SPARQL
│   │   ├── dataProcessor.ts        # Procesamiento de respuestas
│   │   └── musicbrainzService.ts   # Integración con MusicBrainz
│   ├── utils/                      # Utilidades y constantes
│   │   ├── constants.ts
│   │   └── sparqlQueries.ts        # Consultas SPARQL predefinidas
│   └── middleware.ts               # Middleware de Next.js (enrutado i18n)
├── public/                         # Recursos estáticos
│   ├── musigraph-logo-vector.svg
│   └── fonts/Inter/                # Variantes de la fuente Inter
├── AGENTS.md                       # Especificación del proyecto
└── package.json
```

## Fuente de Datos

MusiGraph consulta **Wikidata** (`https://query.wikidata.org/sparql`) en busca de datos musicales estructurados. Wikidata ofrece:

- Amplia cobertura de artistas, álbumes y géneros
- Contenido mantenido por la comunidad y actualizado constantemente
- Soporte multilingüe
- Datos enlazados con referencias

### Propiedades clave de Wikidata utilizadas

| Propiedad | Descripción           | Ejemplo              |
|-----------|-----------------------|----------------------|
| `P31`     | Instancia de          | Humano, grupo musical|
| `P136`    | Género musical        | Rock, Jazz           |
| `P175`    | Intérprete            | Artista/banda        |
| `P577`    | Fecha de publicación  | Lanzamiento del álbum|
| `P737`    | Influenciado por      | Influencias musicales|
| `P569`    | Fecha de nacimiento   | Fecha de nacimiento del artista |
| `P27`     | País de ciudadanía    | Origen del artista   |

> [!TIP]
> Puedes probar consultas SPARQL directamente en el [Wikidata Query Service](https://query.wikidata.org/). Entidades de referencia: The Beatles (`wd:Q1299`), Pink Floyd (`wd:Q2306`), Música rock (`wd:Q11399`).

## Arquitectura

```
Entrada del usuario → SearchBar/FilterPanel → QueryBuilder → SPARQL Service → /api/sparql → Wikidata
                                                                                          ↓
UI Rendering ← DataProcessor ← Procesamiento de respuestas ← Server Action ← Resultados crudos
```

### Patrones clave
- **Componentes de servidor/cliente** — Componentes de servidor para la obtención de datos, componentes de cliente para la interactividad
- **Proxy de ruta API** — `/api/sparql` proxy las peticiones a Wikidata para evitar problemas de CORS
- **Enrutado i18n** — Segmento dinámico `[lang]` con middleware para la detección de locale
- **Sistema de temas** — `next-themes` con soporte de modo oscuro/claro

## Hoja de Ruta

- [x] MVP: búsqueda de artistas con información básica de perfil
- [x] Internacionalización (EN/ES)
- [x] Soporte de tema claro/oscuro
- [x] Proxy de ruta API para consultas SPARQL
- [x] Vista de artista por pestañas (Resumen, Discografía, Influencias, Colaboraciones)
- [x] Filtros de búsqueda avanzados
- [ ] Grafo de red de influencias interactivo (D3.js / dirigido por fuerza)
- [ ] Visualización de línea de tiempo de discografía (Recharts)
- [ ] Caché de consultas y optimización de rendimiento
- [ ] Despliegue de producción en Vercel

## Licencia

Este proyecto está licenciado bajo la [Licencia MIT](./LICENSE).

## Créditos

- **Datos**: [Wikidata](https://www.wikidata.org/) y su comunidad de contribuyentes
- **Framework**: [Next.js](https://nextjs.org/) / [React](https://react.dev/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Iconos**: [Lucide](https://lucide.dev/)