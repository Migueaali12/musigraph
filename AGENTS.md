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

### Typography
- **Main Font**: Inter
- **Location**: `public/fonts/Inter/`
- **Variants**: Variable font with weights from 100 to 900
- **Implementation**: CSS `font-family: 'Inter', sans-serif;`

### Color Palette

#### Primary Colors
- **Coral Vibrant**: `#ff6b6b` - Main action color and highlighted elements
- **Turquoise Musical**: `#4ecdc4` - Secondary color for interactive elements
- **Blue Harmonic**: `#45b7d1` - Tertiary color for information and data

#### Secondary Colors
- **Green Melodic**: `#96ceb4` - Color for success and confirmation elements
- **Gold Rhythmic**: `#ffeaa7` - Color for warning and highlighted elements
- **Pink Symphonic**: `#fd79a8` - Color for special and premium elements

#### Backgrounds and Neutrals
- **Deep Night**: `#0f0f23` - Main dark background
- **Soft Midnight**: `#1a1a2e` - Secondary background and containers
- **Acoustic Gray**: `#2d3748` - Neutral color for text and borders
- **Pure White**: `#ffffff` - Main text on dark backgrounds

#### Gradients
- **Gradient Energy**: `linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)` - For high-energy elements
- **Gradient Ocean**: `linear-gradient(135deg, #45b7d1 0%, #96ceb4 100%)` - For calm and data elements
- **Gradient Sunrise**: `linear-gradient(135deg, #fd79a8 0%, #ffeaa7 100%)` - For special elements

### Icons
- **Library**: Lucide Icons (`lucide-react`)
- **Usage**: Always prefer Lucide Icons over emojis or text symbols for UI elements
- **Implementation**: Import individual icons from `lucide-react` and use as React components
- **Rationale**: Consistent visual style, better accessibility, scalable vector graphics, themeable

### CSS Implementation
```css
:root {
  /* Primary Colors */
  --coral-vibrant: #ff6b6b;
  --turquoise-musical: #4ecdc4;
  --blue-harmonic: #45b7d1;
  
  /* Secondary Colors */
  --green-melodic: #96ceb4;
  --gold-rhythmic: #ffeaa7;
  --pink-symphonic: #fd79a8;
  
  /* Backgrounds and Neutrals */
  --deep-night: #0f0f23;
  --soft-midnight: #1a1a2e;
  --acoustic-gray: #2d3748;
  --pure-white: #ffffff;
  
  /* Gradients */
  --gradient-energy: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%);
  --gradient-ocean: linear-gradient(135deg, #45b7d1 0%, #96ceb4 100%);
  --gradient-sunrise: linear-gradient(135deg, #fd79a8 0%, #ffeaa7 100%);
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
