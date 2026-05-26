<div align="center">
  <img src="public/musigraph-logo-vector.svg" alt="MusiGraph Logo" width="120" height="110" />
  <h1>MusiGraph</h1>
  <p>Semantic Music Explorer — Discover connections in music through linked data</p>
</div>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs" alt="Next.js" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" /></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm" alt="pnpm" /></a>
  <a href="https://www.wikidata.org"><img src="https://img.shields.io/badge/Data-Wikidata-006699?style=flat-square&logo=wikidata" alt="Wikidata" /></a>
</p>

<p align="center">
  <a href="#features">Features</a>
  &middot;
  <a href="#tech-stack">Tech Stack</a>
  &middot;
  <a href="#getting-started">Getting Started</a>
  &middot;
  <a href="#project-structure">Project Structure</a>
  &middot;
  <a href="#data-source">Data Source</a>
  &middot;
  <a href="#roadmap">Roadmap</a>
</p>

---

## Overview

MusiGraph is a web application that explores the musical universe through **semantic data visualization**. It queries real-time information from **Wikidata** using **SPARQL** to reveal connections between artists, albums, genres, influences, and collaborations that traditional search tools miss.

> [!NOTE]
> This project is currently in active development (MVP phase). The focus is on building a solid foundation for semantic music exploration and relationship visualization.

## Features

### Current

- **Artist Search** — Look up any musician or band and retrieve structured information
- **SPARQL Integration** — Direct queries to Wikidata Query Service for real-time data
- **Artist Profiles** — Display biographical data, genres, instruments, and origins
- **Responsive UI** — Built with Tailwind CSS for a consistent experience across devices

### Planned

- **Influence Network** — Interactive graph showing musical influences between artists
- **Discography Timeline** — Visual timeline of album releases
- **Collaboration Explorer** — Map collaborations and "degrees of separation"
- **Genre Evolution** — Track how genres emerge and branch over time
- **Geographic Mapping** — Explore musical scenes by region
- **Advanced Filters** — Filter by genre, decade, country, and artist type

## Tech Stack

| Category      | Technology                          |
|---------------|-------------------------------------|
| Framework     | [Next.js 15](https://nextjs.org/)   |
| UI Library    | [React 19](https://react.dev/)      |
| Language      | [TypeScript 5](https://www.typescriptlang.org/) |
| Styling       | [Tailwind CSS 4](https://tailwindcss.com/) |
| Icons         | [Lucide React](https://lucide.dev/) |
| Data Source   | [Wikidata SPARQL](https://query.wikidata.org/) |
| Package Manager | [pnpm](https://pnpm.io/)          |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- [pnpm](https://pnpm.io/) (or npm/yarn)

### Installation

```bash
# Clone the repository
git clone https://github.com/Migueaali12/musigraph.git
cd musigraph

# Install dependencies
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

### Linting

```bash
pnpm lint
```

## Project Structure

```
musigraph/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/
│   │   ├── artist/             # Artist-related components
│   │   │   ├── ArtistProfile.tsx
│   │   │   └── DiscographyView.tsx
│   │   ├── common/             # Shared UI components
│   │   │   ├── AppStats.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── WelcomeMessage.tsx
│   │   └── search/             # Search-related components
│   │       ├── SearchBar.tsx
│   │       └── SearchResults.tsx
│   ├── services/               # Data and query services
│   │   ├── sparqlService.ts    # Wikidata SPARQL client
│   │   ├── queryBuilder.ts     # Dynamic SPARQL query builder
│   │   ├── dataProcessor.ts    # Response processing
│   │   └── musicbrainzService.ts # MusicBrainz integration
│   └── utils/                  # Utilities and constants
│       ├── constants.ts
│       └── sparqlQueries.ts    # Predefined SPARQL queries
├── public/                     # Static assets
│   └── musigraph-logo-vector.svg
├── AGENTS.md                   # Project specification
└── package.json
```

## Data Source

MusiGraph queries **Wikidata** (`https://query.wikidata.org/sparql`) for structured musical data. Wikidata provides:

- Broad coverage of artists, albums, and genres
- Community-maintained and constantly updated
- Multi-language support
- Linked data with references

### Key Wikidata Properties Used

| Property | Description           | Example              |
|----------|-----------------------|----------------------|
| `P31`    | Instance of           | Human, musical group |
| `P136`   | Musical genre         | Rock, Jazz           |
| `P175`   | Performer             | Artist/band          |
| `P577`   | Publication date      | Album release        |
| `P737`   | Influenced by         | Musical influences   |
| `P569`   | Date of birth         | Artist birth date    |
| `P27`    | Country of citizenship| Artist origin        |

> [!TIP]
> You can test SPARQL queries directly at the [Wikidata Query Service](https://query.wikidata.org/). Reference entities: The Beatles (`wd:Q1299`), Pink Floyd (`wd:Q2306`), Rock music (`wd:Q11399`).

## Architecture

```
User Input → SearchBar → QueryBuilder → SPARQL Service → Wikidata
                                                       ↓
UI Rendering ← DataProcessor ← Response Processing ← Raw Results
```

## Roadmap

- [ ] MVP: Artist search with basic profile information
- [ ] Discography with release timeline
- [ ] Interactive influence network graph
- [ ] Collaboration explorer with connection paths
- [ ] Query caching and performance optimization
- [ ] Production deployment

## License

This project is licensed under the [MIT License](./LICENSE).

## Credits

- **Data**: [Wikidata](https://www.wikidata.org/) and its community of contributors
- **Framework**: [Next.js](https://nextjs.org/) / [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide](https://lucide.dev/)
