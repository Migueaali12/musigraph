# MusiGraph - Semantic Music Explorer

## 1. Project Context

### Application Name
**MusiGraph**

### Description
MusiGraph is a web application that allows users to explore the musical universe through connected semantic data. The application queries real-time information from RDF databases to visualize complex relationships between artists, albums, musical genres, artistic influences, and collaborations. Users can discover hidden connections in music, explore the evolution of musical genres, and map influences between artists from different eras.

### Main Objectives
- Facilitate the exploration of interconnected musical data
- Visualize relationships between artists, genres, and musical movements
- Provide insights into musical influences and collaborations
- Create an educational and musical discovery experience
- Demonstrate the power of semantic data in the musical domain

## 1.1 Visual Identity and Design

### Application Logo
- **File**: `public/musigraph-logo-vector.svg`
- **Format**: SVG vector for scalability
- **Usage**: Header, favicon, and branding elements

### Design Direction
- **Concept**: "Engineering notebook". The graph-paper dot grid is the visual signature.
- **Light theme**: warm paper (`#f8f7f4`) with ink text and hairline borders.
- **Dark theme**: night blueprint (`#0f0f23`) with the same dot grid.
- **Rules**: one accent color (coral), no gradients anywhere, no drop shadows, hairline borders for structure, motion is CSS-only and artisanal (no GSAP).

### Typography
- **Main Font**: Space Mono (weights 400 and 700)
- **Implementation**: `next/font/google` exposed as `--font-space-mono`, mapped to `--font-sans` and `--font-mono`
- **Important**: the `spaceMono.variable` class must live on `<html>` (not `<body>`). `--font-sans` is declared on `:root`, so `--font-space-mono` has to exist on `<html>` for the `var()` reference to resolve; if it only lives on `<body>`, `--font-sans` becomes invalid at computed-value time and everything silently falls back to `system-ui`.
- **Rule**: Space Mono is the only typeface in the UI. Do not introduce Inter, Roboto, or system-sans fallbacks for content.
- **Scale**: micro labels 11px uppercase `tracking-[0.14em]`; body 15px / line-height 1.7; headings tight (`tracking-tight`, line-height ~1.15). Numbers align naturally because the font is monospaced.

### Color Palette

#### Accent (single UI accent)
- **Coral Vibrant**: `#ff6b6b` - brand accent, fills and borders only
- **Accent text (light)**: `#a83232` - accessible coral for text/links on light (6.19:1)
- **Accent text (dark)**: `#ff9e9e` - accessible coral for text/links on dark (9.5:1)
- **Rule**: coral is never used as light text on a light background, and never as a large solid fill behind white text.

#### Category Colors (chips/tags only)
- **Turquoise Musical**: text `#1f6c63` (light) / `#7fded6` (dark)
- **Blue Harmonic**: text `#1f6c9f` (light) / `#7cc7e8` (dark)
- **Green Melodic**: text `#346538` (light) / `#a8d8be` (dark)
- Chips use a 10-14% wash background of the same hue plus the accessible text variant.

#### Backgrounds and Neutrals
- **Engineering Paper**: `#f8f7f4` - light background
- **Deep Night**: `#0f0f23` - dark background and primary ink in light mode
- **Soft Midnight**: `#1a1a2e` - dark surface and containers
- **Muted**: `#565e6b` (light, 6.11:1) / `#94a3b8` (dark)

#### Gradients
- **Removed**: the former gradient tokens do not exist anymore. Do not reintroduce gradients; use flat fills, hairlines, and the dot grid.

### Shape and Focus
- **Radius system**: 2px chips, 4px controls/inputs, 6px panels. Nothing larger.
- **Focus**: global `:focus-visible` outline, 2px `var(--ring)` with 2px offset. Do not remove outlines.
- **Icons**: Lucide only, standardized `strokeWidth={1.5}`, sizes 14/16/20. No emojis.

### Motion
- CSS-only: `rise` entry (320ms, `cubic-bezier(0.16, 1, 0.3, 1)`), hand-drawn link underline, blinking block cursor for search/loading states.
- Animate only `transform`, `opacity`, and colors. No `transition-all`.
- Everything must respect `prefers-reduced-motion`.

### CSS Implementation
```css
:root {
  /* Light theme: engineering paper */
  --background: #f8f7f4;
  --foreground: #0f0f23;
  --surface: #ffffff;
  --surface-elevated: #f1f0ec;
  --border: #e2e0db;
  --muted: #565e6b;
  --primary: #0f0f23;
  --primary-foreground: #f8f7f4;
  --ring: #a83232;

  /* Coral accent (fill + accessible text variant) */
  --accent: #a83232;
  --accent-soft: rgba(255, 107, 107, 0.1);
  --accent-vibrant: #ff6b6b;

  /* Category colors (chips only) */
  --turquoise: #1f6c63;
  --blue: #1f6c9f;
  --green: #346538;

  /* Graph-paper dot grid */
  --grid-dot: rgba(15, 15, 35, 0.08);
}

.dark {
  --background: #0f0f23;
  --foreground: #f8f7f4;
  --surface: #1a1a2e;
  --surface-elevated: #232338;
  --border: rgba(248, 247, 244, 0.12);
  --muted: #94a3b8;
  --primary: #ff6b6b;
  --primary-foreground: #0f0f23;
  --ring: #ff9e9e;

  --accent: #ff9e9e;
  --accent-soft: rgba(255, 107, 107, 0.14);
  --accent-vibrant: #ff6b6b;

  --turquoise: #7fded6;
  --blue: #7cc7e8;
  --green: #a8d8be;

  --grid-dot: rgba(248, 247, 244, 0.07);
}
```

## 2. RDF Store Selection

### Main Data Source
**Wikidata** - `https://query.wikidata.org/sparql`

#### Justification
- Broad coverage of structured musical data
- Information constantly updated by the community
- Multi-language support (Spanish, English)
- Robust and well-documented SPARQL API
- Verified data with references

#### Alternative Sources (optional)
- **DBpedia**: `https://dbpedia.org/sparql`
- **MusicBrainz RDF**: For detailed technical data
- **BBC Music**: For additional genre data

## 3. Base SPARQL Queries

### 3.1 Basic Artist Information Search

```sparql
# Search for basic information about an artist (example: "The Beatles")
SELECT ?artistLabel ?birthDate ?countryOriginLabel ?genreLabel ?instrumentLabel
WHERE {
  ?artist wdt:P31 wd:Q5 ;                    # instance of "human"
          rdfs:label "The Beatles"@en ;
          wdt:P106 wd:Q639669 ;              # occupation: musician
          wdt:P569 ?birthDate ;              # date of birth
          wdt:P27 ?countryOrigin ;           # country of citizenship
          wdt:P136 ?genre ;                  # musical genre
          wdt:P1303 ?instrument .            # instrument played
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
```

### 3.2 Explore Artist Discography

```sparql
# Search for albums by a specific artist
SELECT ?albumLabel ?publicationDate ?recordLabelLabel ?genreLabel
WHERE {
  ?artist rdfs:label "Pink Floyd"@en ;
          wdt:P31 wd:Q215380 .               # instance of "musical group/band"
  
  ?album wdt:P31 wd:Q482994 ;                # instance of "album"
         wdt:P175 ?artist ;                  # performer
         wdt:P577 ?publicationDate ;         # publication date
         wdt:P264 ?recordLabel ;             # record label
         wdt:P136 ?genre .                   # musical genre
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
ORDER BY ?publicationDate
```

### 3.3 Search for Collaborations Between Artists

```sparql
# Find musical collaborations
SELECT ?songLabel ?artist1Label ?artist2Label ?publicationDate
WHERE {
  ?song wdt:P31 wd:Q7366 ;                   # instance of "song"
        wdt:P175 ?artist1 ;                  # performer 1
        wdt:P175 ?artist2 ;                  # performer 2
        wdt:P577 ?publicationDate .          # publication date
  
  FILTER(?artist1 != ?artist2)               # ensure they are different artists
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
ORDER BY DESC(?publicationDate)
LIMIT 50
```

### 3.4 Explore Musical Influences

```sparql
# Search for influences of an artist
SELECT ?artistLabel ?influenceLabel ?influenceGenreLabel
WHERE {
  ?artist rdfs:label "David Bowie"@en ;
          wdt:P737 ?influence ;              # influenced by
          wdt:P136 ?genre .                  # artist's genre
  
  ?influence wdt:P136 ?influenceGenre .      # influence's genre
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
```

### 3.5 Search Artists by Musical Genre

```sparql
# Search for artists of a specific genre
SELECT ?artistLabel ?countryOriginLabel ?formationDate
WHERE {
  ?artist wdt:P31/wdt:P279* wd:Q215380 ;     # instance/subclass of "musical group"
          wdt:P136 wd:Q11399 ;               # genre: rock
          wdt:P495 ?countryOrigin ;          # country of origin
          wdt:P571 ?formationDate .          # date of formation
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
ORDER BY ?formationDate
LIMIT 100
```

## 4. Web Application Prototype

### 4.1 Recommended Tech Stack
- **Frontend**: Next.js 14 + TypeScript
- **Styling**: TailwindCSS + Shadcn/ui
- **Visualization**: Recharts + D3.js (for network graphs)
- **State**: Zustand or React Context
- **Queries**: Fetch API with caching
- **Deployment**: Vercel
- **Package Manager**: pnpm

### 4.2 Main Application Flow

#### User Input
- Main search field (artist/band name)
- Advanced filters:
  - Musical genre
  - Decade/Year
  - Country of origin
  - Type (soloist/band/composer)

#### Backend Processing
1. Receive user query
2. Dynamic construction of SPARQL query
3. Send query to Wikidata endpoint
4. Process and clean results
5. Structure data for frontend

#### Results Visualization
**Basic Artist Information:**
- Full name
- Date of birth/formation
- Country of origin
- Musical genre(s)
- Main instruments
- Photo/image (if available)

**Discography:**
- List of albums with dates
- Record labels
- Temporal chart of releases

**Influence Network:**
- Interactive influence graph
- Bidirectional connections (influences/influenced by)
- Genre-based visualization

**Collaborations:**
- List of notable collaborations
- Network of frequent collaborators
- Collaboration timeline

## 5. Advanced Features

### 5.1 Available Search Types

#### Artist Search
- Complete information about the selected artist
- Detailed discography
- Network of influences and collaborators

#### Genre Search
- Representative artists of the genre
- Temporal evolution of the genre
- Related subgenres
- Geographic origin map

#### Decade Search
- Most influential artists by period
- Dominant genres by era
- Important musical events

#### Connection Explorer
- "Degrees of separation" between artists
- Musical influence paths
- Collaboration networks

#### Country/Region Search
- Musical scene by region
- International vs. local artists
- Cultural influences on music

### 5.2 Interactive Visualizations

#### Main Dashboard
- Global metrics of the music database
- Most connected artists
- Trending genres (by queries)

#### Musical Network Graph
- Nodes: Artists, albums, genres
- Edges: Influences, collaborations, similarities
- Interactivity: zoom, filters, search

#### Musical Timeline
- Evolution of musical genres
- Important milestones in music
- Correlation between historical events and music

#### Geographic Maps
- Geographic origin of musical movements
- Worldwide musical influence routes
- Artist concentration by region

## 6. System Architecture

### 6.1 Frontend Components
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

### 6.2 Backend Services
```
services/
├── sparqlService.ts      # Connection with Wikidata
├── queryBuilder.ts       # Dynamic query construction
├── dataProcessor.ts      # Results processing
└── cacheService.ts       # Cache for frequent queries
```

### 6.3 Utilities and Helpers
```
utils/
├── sparqlQueries.ts      # Predefined SPARQL queries
├── dataTransformers.ts   # Data transformation
├── networkAnalysis.ts    # Musical network analysis
└── constants.ts          # Constants and configuration
```

## 7. Specific Use Cases

### 7.1 Use Case 1: Explore Influences of The Beatles
1. User searches for "The Beatles"
2. System displays basic band profile
3. User clicks "View Influences"
4. Graph displays with Chuck Berry, Elvis Presley, Little Richard
5. User can recursively explore influences

### 7.2 Use Case 2: Discover Rock Evolution
1. User selects genre "Rock"
2. System generates timeline from 1950-2020
3. Shows emerging subgenres by decade
4. User can zoom into specific periods
5. Visualizes key artists and influential albums

### 7.3 Use Case 3: Map Artist Collaborations
1. User searches for "Johnny Cash"
2. Selects "Collaborations" tab
3. System displays network of collaborators
4. Highlights collaborations with June Carter, Bob Dylan
5. Allows exploring collaborators' careers

## 8. Success Metrics

### 8.1 Technical Metrics
- Response time < 3 seconds
- Availability > 99%
- Data coverage > 10,000 artists
- Query accuracy > 95%

### 8.2 User Metrics
- Average session time > 5 minutes
- Number of queries per session > 3
- Bounce rate < 40%
- User satisfaction > 4/5

## 9. Technical Considerations

### 9.0 Validation Rules
- **Run build and typecheck** after every code change that modifies source files
- Commands to validate:
  ```bash
  pnpm typecheck
  pnpm build
  ```
- Never commit changes without first confirming both commands pass successfully
- If validation fails, fix all errors before proceeding

### 9.1 Optimization
- Cache for frequent SPARQL queries
- Pagination for large results
- Lazy loading for heavy components
- Optimization of complex queries

### 9.2 Error Handling
- SPARQL query timeout (30s)
- Fallback for missing data
- Informative error messages
- Basic offline mode

### 9.3 Scalability
- Rate limiting for queries
- CDN for static resources
- Performance monitoring
- Usage analytics

## 10. Development Phases

### Phase 1: MVP (2 weeks)
- Basic artist search
- Fundamental information
- Simple interface

### Phase 2: Visualizations (2 weeks)
- Influence graph
- Discography timeline
- UX improvements

### Phase 3: Advanced Features (2 weeks)
- Multiple search types
- Advanced filters
- Optimizations

### Phase 4: Polish and Deploy (1 week)
- Exhaustive testing
- Performance optimization
- Production deployment

---

## Additional Resources

### Useful Links
- [Wikidata Query Service](https://query.wikidata.org/)
- [SPARQL Tutorial](https://www.w3.org/TR/sparql11-query/)
- [Wikidata Music Properties](https://www.wikidata.org/wiki/Wikidata:WikiProject_Music)

### Query Examples for Testing
- The Beatles: `wd:Q1299`
- Pink Floyd: `wd:Q2306`
- Bob Dylan: `wd:Q392`
- Rock music: `wd:Q11399`
- Jazz: `wd:Q8341`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
