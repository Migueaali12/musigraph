# Plan de enriquecimiento de datos — MusiGraph

> **Fuente de verdad para todos los agentes.** Última actualización: 2026-10-09.
> Rama de trabajo: `feat/data-enrichment`. Validad siempre con `pnpm typecheck && pnpm build` antes de dar algo por terminado (regla de `AGENTS.md`).

---

## 0. Estado general

| Fase | Alcance | Estado |
|------|---------|--------|
| **0** | Cimientos: proveedores, idioma (locale), validación, caché, fechas, limpieza | ✅ Completada |
| **1** | Optimización de consultas Wikidata + DBpedia funcional | ✅ Completada |
| **2** | Enriquecimiento multi-fuente + modo **Auto** + Discogs | ✅ Completada (2026-10-09) |
| **3** | UI y rendimiento (selector Auto, badges de fuente, render progresivo) | ✅ Completada (2026-10-09) |
| **4** | Página de metodología `/[lang]/data` | ✅ Completada (2026-10-09) |
| **5** | Preparación WDQS v2 (`query-next.wikidata.org`) y monitoreo | ⏳ Pendiente |

**Commits:**
- `27acad8` — Fase 0 + Fase 1 completas (en `feat/data-enrichment`).
- `0e7c880` — fix de claves duplicadas en discografía (en `feat/data-enrichment`, **sin pushear**).
- `9984d6f` — upgrade a Next.js 16.4 (en `feat/data-enrichment`, **sin pushear**).
- `main` fue restaurado a `596595f` (el commit accidental se movió a la rama con force-push).

---

## 1. Arquitectura actual

### 1.1 Flujo de datos

```
UI (HomeClient / ArtistProfile)
  └─ sparqlService (cliente: dedupe in-flight + caché 10 min)
       └─ POST /api/sparql  (route handler, server-only)
            ├─ validación de params (QIDs, MBIDs, Discogs ids, décadas, recursos DBpedia, sanitización)
            ├─ caché LRU servidor (1 h)
            ├─ dispatch:
            │    ├─ proveedor explícito → actions.ts (builders + ejecución + post-proceso)
            │    └─ auto → orchestrator.ts
            │         ├─ core Wikidata (failover QLever, timeouts 12 s / 8 s)
            │         ├─ identidad vía wbgetentities (sitelinks en/es + P434/P1953/…)
            │         ├─ adaptadores REST con caché por fuente:
            │         │    Wikipedia 6 h · DBpedia ES 6 h · MusicBrainz 24 h (cola 1 rps) · Discogs 24 h
            │         └─ merge por bindings + provenance (`sources`)
            └─ respuesta JSON (bindings + `sources` + `enrichment`)
                 └─ sparqlService procesa (dedupe, merge, ranking, filtros)
                      └─ dataProcessor (orden, estadísticas, agrupaciones)
                           └─ tabs (Overview / Discography / Influences / Collaborations)
```

### 1.2 Archivos clave

| Archivo | Rol |
|---|---|
| `src/services/providers.ts` | Registro de proveedores (`wikidata`, `qlever`, `dbpedia`, `auto`) + `ProviderId`/`Engine`/`Lang` |
| `src/services/queries/labels.ts` | Helpers de etiquetado por idioma (label service v1 + bloques `OPTIONAL/COALESCE`) |
| `src/services/queries/wikidata.ts` | Builders Wikidata (perfil, rasgos, discografía, influencias, colaboraciones, batches) |
| `src/services/queries/dbpedia.ts` | Builders DBpedia (búsqueda, traits, discografía, influencias, colaboraciones) |
| `src/services/serverCache.ts` | `TtlCache` LRU genérica (servidor) |
| `src/services/sparqlExecutor.ts` | Ejecución SPARQL (timeout/retry/parciales) + `wbsearchentities` |
| `src/services/sparqlPostprocess.ts` | Labels por lotes y clasificación de obras |
| `src/services/actions.ts` | Acciones por proveedor explícito (wikidata/qlever/dbpedia) + `source` por fila |
| `src/services/sparqlTypes.ts` / `src/services/sources.ts` | Contrato de bindings + tipos de procedencia (compartidos) |
| `src/services/enrichment/` | Adaptadores server-only (`wikidataApi`, `wikipedia`, `musicbrainz`, `dbpediaEs`, `discogs`) + orquestador `auto` |
| `src/app/api/sparql/route.ts` | API única: validación, caché, dispatch a acciones/orquestador |
| `src/services/sparqlService.ts` | Cliente: request layer, procesamiento, ranking, tipos |
| `src/services/dataProcessor.ts` | Orden, dedupe, estadísticas, `groupCollaborations`, redes |
| `src/utils/date.ts` | `extractYear`, `formatYear`, `parseFullDate` (fechas parciales) |
| `src/utils/validation.ts` | `isQid`, `isDbpediaResource`, `isAllowedDecade`, sanitización |
| `src/utils/constants.ts` | `FEATURED_ARTIST_IDS` (verificados) + constantes existentes |

### 1.3 Proveedores registrados

| ID | Endpoint | Motor | Estado |
|---|---|---|---|
| `wikidata` | `query.wikidata.org/sparql` | Blazegraph (v1) | Selector ✅ |
| `qlever` | `qlever.dev/api/wikidata` | QLever | Selector ✅ (ensayo v2) |
| `dbpedia` | `dbpedia.org/sparql` | Virtuoso | Selector ✅ |
| `auto` | — (orquesta varios) | — | Solo en registro; **entra al selector en Fase 2/3** |

---

## 2. Decisiones de arquitectura (vinculantes)

1. **El locale viaja de punta a punta.** `HomeClient → sparqlService → /api/sparql → builders`. Toda consulta nueva debe aceptar `lang: "en" | "es"`.
2. **Etiquetado por motor, no universal:**
   - **Blazegraph (v1):** `SERVICE wikibase:label` con prioridad `"<lang>,<fallback>,mul"` (rápido).
   - **QLever (v2):** NO existe label service → bloques `OPTIONAL rdfs:label + BIND(COALESCE(...))` o resolución por lotes `VALUES`.
   - **Virtuoso (DBpedia):** bloques `OPTIONAL + COALESCE` o lotes. **Nunca** cadenas de labels inline en consultas grandes (provoca *anytime queries* con resultados parciales que violan `FILTER`).
3. **Patrón de dos fases para evitar productos cartesianos.** Búsqueda = perfil (1 fila/artista) + rasgos (una fila por rasgo) ejecutadas en paralelo; los rasgos se filtran a los artistas que pasaron el perfil.
4. **`VALUES` siempre dentro de cada rama `UNION`** o usar el patrón variable-de-propiedad (`VALUES ?prop { … } ?artist ?prop ?trait`). `VALUES` fuera del `UNION` hacía que Blazegraph escaneara: 64 s en frío vs 0.6 s.
5. **Prohibido en código nuevo:** `wikibase:mwapi` (no soportado en v2 — ya usamos la API MediaWiki aparte), `hint:*`, named subqueries, `wdt:P31/wdt:P279*` sobre tipos (preferir `VALUES`), y label service en QLever.
6. **Validación estricta** de todo lo que se interpola: QIDs (`^Q\d+$`), décadas, recursos DBpedia, sanitización de términos (`bif:contains`), escape de literales. Proveedores por ID con whitelist (las URLs nunca salen del cliente).
7. **Caché y resiliencia:** LRU servidor 1 h + caché cliente 10 min + dedupe in-flight; retry una vez ante 429/502/503/504 (espera máx. 5 s); si los rasgos fallan, el perfil igual responde.
8. **Secretos solo en servidor** (ej. `DISCOGS_TOKEN` en env, nunca al cliente).

---

## 3. Hallazgos verificados (evidencia)

### 3.1 Migración WDQS Blazegraph → QLever (crítico)

- **Nov 2026:** nuevos endpoints v2 (`query-next.wikidata.org`) abiertos a la comunidad.
- **Feb 2027:** los endpoints Blazegraph empiezan a degradarse.
- Verificado empíricamente: QLever devuelve **404** con `SERVICE wikibase:label` y exige `PREFIX` explícitos. `wikibase:mwapi` no existe en v2. Fechas estrictas (`xsd:dateTime` con hora).
- Endpoint de ensayo actual: `https://qlever.dev/api/wikidata?format=json&query=...` (o POST con `Content-Type: application/sparql-query`).

### 3.2 DBpedia (endpoint público)

- Solo contiene el capítulo inglés; **sin `dbo:abstract`** en el core actual.
- Las bandas son `dbo:Band` / `dbo:Group`, **no** `dbo:MusicalArtist` (la búsqueda antigua estaba rota para bandas).
- `FILTER CONTAINS` full-scan → usar índice de texto `bif:contains`.
- **Sin álbumes ni colaboraciones de The Beatles** vía `dbo:artist` (limitación de datos; verificado con COUNT=0). Discografía/colaboraciones deben venir de Wikidata/MusicBrainz.
- Virtuoso devuelve **200 con resultados parciales** en consultas lentas (headers `X-SPARQL-MaxRows` / `X-SQL-Message`); esos parciales pueden violar `FILTER`. De ahí el patrón de consulta ligera + enriquecimiento por lotes.
- `es.dbpedia.org/sparql` sí tiene abstracts en español (para Fase 2).

### 3.3 MusicBrainz

- **No existe la relación "influenced by"** (verificado en la lista oficial de tipos artist-artist). Relaciones útiles reales: `member of band`, `collaboration`, `supporting musician`, `teacher`, `tribute`, `named after artist`.
- Rate limit: 1 req/s (User-Agent obligatorio). Debe ir con cola y caché.

### 3.4 Rendimiento medido (caliente; WDQS puede throttlear con uso intensivo)

| Acción | Wikidata v1 | QLever |
|---|---|---|
| Búsqueda (12 entidades) | 1.2–1.7 s | 1.4 s |
| Discografía (60 filas) | 1.0–1.5 s | 1.5 s |
| Influencias (40) | 1.7 s | 0.8 s |
| Colaboraciones (47) | 1.5 s | 1.3 s |
| Batch de labels/tipos | 0.3–2.5 s | 50 ms |

Optimizaciones puntuales: workType directo 0.48 s (vs 3.4 s con `OPTIONAL/BIND`); rasgos con variable-de-propiedad 0.64 s en frío (vs 64 s con `VALUES` fuera del `UNION`); DBpedia búsqueda+traits ~2 s.

### 3.5 Lista curada corregida (`FEATURED_ARTIST_IDS`)

Verificada contra `wbsearchentities`: Beatles `Q1299`, Pink Floyd `Q2306`, Led Zeppelin `Q2331`, Rolling Stones `Q11036`, Bob Dylan `Q392`, Radiohead `Q44190`, Nirvana `Q11649`, David Bowie `Q5383`, Johnny Cash `Q42775`, Miles Davis `Q93341`. (Cinco QIDs anteriores estaban mal.)

---

## 4. Fase 0 — Cimientos ✅

Entregado:
- Registro de proveedores con whitelist y compatibilidad legacy (URLs).
- Locale de punta a punta + estrategias de etiquetado por motor. **Bug de idioma corregido** (antes todo salía en español aunque la UI estuviera en inglés).
- Validación estricta (400 en entradas inválidas), escape de literales.
- Caché LRU servidor + caché/dedupe cliente.
- `utils/date.ts` (fin de los `NaN` con fechas parciales) y `utils/validation.ts`.
- Retry 429/502/503/504; detección de parciales Virtuoso; tolerancia a fallos de rasgos.
- Limpieza: eliminado `src/utils/sparqlQueries.ts` y 4 funciones muertas de MusicBrainz; page de test actualizada.
- QLever en el selector + soporte server-side.

## 5. Fase 1 — Optimización ✅

Entregado:
- **Búsqueda:** `wbsearchentities` + perfil/rasgos paralelos + ranking (match exacto > popularidad `wikibase:sitelinks` > relevancia musical) + filtro por tipo de artista + descripción corta y popularidad en resultados.
- **Discografía:** tipos ampliados (`Q482994` álbum, `Q208569` estudio, `Q209939` directo, `Q222910` recopilatorio, `Q169930` EP, `Q134556` single), chip de tipo, `LIMIT` antes de labels, dedupe + merge de sellos/géneros por álbum.
- **Influencias:** `P737` directo + inverso + `P1066` (*student of*), orden por popularidad.
- **Colaboraciones:** canciones y álbumes multi-`P175` (sin property path: 57 s → 1.5 s), clasificación canción/álbum en lote, agrupación por colaborador en UI con conteo y obras.
- **DBpedia:** bandas encontradas (`dbo:Band/Group`), `bif:contains`, subquery `LIMIT` + traits por lotes.
- **Fix posterior (`0e7c880`):** dedupe de releases en `processAlbumResults` + tabs reciben datos procesados + key robusta (error de claves duplicadas `Q255255`).

---

## 6. Fase 2 — Enriquecimiento multi-fuente + modo Auto + Discogs ⏳

### 6.1 Modo Auto (orquestador)

`auto` pasa a ser el modo por defecto del selector en la Fase 3; el backend se implementa aquí.

**Join keys (resolución de identidad):**
- `Q-id` (Wikidata) es la clave primaria.
- `P434` (MusicBrainz ID) → MusicBrainz REST.
- `P1953` (Discogs ID) → Discogs API.
- Sitelinks (`schema:about` + `schema:isPartOf` es/en Wikipedia) → Wikipedia REST summary + recurso DBpedia (`owl:sameAs` / título).

**Matriz de capacidades (base del merge):**

| Capa | Wikidata | DBpedia | MusicBrainz | Wikipedia REST | Discogs |
|---|---|---|---|---|---|
| Identidad/búsqueda | ✅ `wbsearchentities` | ⚠️ limitada | ⚠️ search | — | ⚠️ search |
| Bio/descripción | descripción corta | description (es: abstract vía es.dbpedia) | — | ✅ summary (idioma UI) | perfil |
| Discografía | ✅ incompleta | ❌ sin datos | ✅✅ la más completa | — | ✅ + formatos/sellos |
| Relaciones | ✅ P737/P1066 (escaso) | ❌ vacío | ✅ teacher/tribute/member/collab | — | — |
| Colaboraciones | ✅ P175 múltiple | ❌ | ✅ | — | ⚠️ credits |
| Géneros/tags | ✅ P136 | ✅ genre | ✅ genres+tags | — | ✅ styles |
| IDs externos | ✅ MBID/Discogs/Spotify… | `owl:sameAs` | MBID nativo | — | nativo |
| Popularidad | ✅ sitelinks | — | ratings | — | community |
| Imágenes | P18 | thumbnail | cover art | thumbnail | cover |

**Precedencia por campo (documentar en `/[lang]/data`):**
- Nombre: label Wikidata (idioma UI) → título Wikipedia.
- Bio: Wikipedia summary (idioma UI) → abstract DBpedia (si `lang=es`) → descripción Wikidata.
- Imagen: `P18` (thumbnail `Special:FilePath?width=320`) → thumbnail Wikipedia → DBpedia.
- Discografía: unión **MusicBrainz + Wikidata + Discogs**, dedupe por título normalizado + año, badge de fuente por ítem.
- Géneros: unión Wikidata ∪ tags MB, dedupe.
- Relaciones: P737/P1066 (reales) + MB (teacher/tribute/member) con tipo; similitud de género etiquetada como **"sugerencia"** (usar `dataProcessor.calculateSimilarity`), nunca como influencia real.
- Colaboraciones: SPARQL (canciones/álbumes) + relaciones MB, agrupadas por colaborador.

**Comportamiento y resiliencia:**
- Fan-out en paralelo con `Promise.allSettled` y timeout por fuente (6–10 s). El perfil core (Wikidata) es esencial; el resto es enriquecimiento.
- La respuesta incluye `sources: { wikidata: "ok", musicbrainz: "timeout", … }` para provenance. Nada rompe la página si una fuente falla.
- Caché por fuente con TTL distinto: Wikidata 1 h, Wikipedia 6 h, DBpedia 6 h, MusicBrainz 24 h, Discogs 24 h.

### 6.2 Wikipedia REST (bios)

- `https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}` usando el sitelink del idioma activo.
- Mostrar con atribución "Fuente: Wikipedia" en `OverviewTab`.
- Endpoint nuevo del API: p. ej. `getArtistBio` con `{ artistId, lang }` (server-side, keyed por Q-id → sitelink).

### 6.3 IDs externos

- Añadir a la query de perfil: `P434`, `P1953`, `P1902` (Spotify), `P3192` (Last.fm), `P1728` (AllMusic).
- `ArtistInfo.externalIds` + chips de enlaces externos en `ArtistProfile`.

### 6.4 DBpedia es (abstracts)

- Cuando `lang=es` y el recurso DBpedia exista: consultar `https://es.dbpedia.org/sparql` para `dbo:abstract` es (verificado operativo).
- Degradación elegante: timeout corto, fallback a Wikipedia/descripción Wikidata.
- Añadir `es.dbpedia.org` al registro de proveedores como fuente interna (no en el selector).

### 6.5 MusicBrainz enriquecido (REST, server-side)

- Mover las llamadas a server-side (hoy el fallback de discografía se hace desde el cliente).
- Añadir: `inc=genres+tags` (géneros), `inc=artist-rels` (member of band, collaboration, teacher, tribute), discografía completa paginada.
- **Cola con rate limit de 1 req/s** + caché 24 h. Nunca en path crítico sin timeout.
- No reintroducir código de "influencias" (no existe esa relación).

### 6.6 Discogs (token)

- **Requiere `DISCOGS_TOKEN`** (se pedirá al usuario al implementar este adaptador; `.env.local` + env de Vercel). Feature flag: si no hay token, la fuente se desactiva sola.
- Endpoints: `artists/{id}` (perfil), `artists/{id}/releases?per_page=100&sort=year` (discografía con formato/sello/año), `database/search` (fallback si no hay `P1953`).
- Server-only; User-Agent obligatorio; 60 req/min autenticado; caché 24 h.

### 6.7 Checklist de implementación Fase 2

- [x] `src/services/enrichment/`: adaptadores `wikidataApi.ts` (identidad), `wikipedia.ts`, `musicbrainz.ts`, `dbpediaEs.ts`, `discogs.ts` + `orchestrator.ts`
- [x] Orquestador `auto` server-side dedicado con merge por bindings + provenance
- [x] Acciones/params nuevos del API: `getArtistEnrichment`, `mbid`/`discogsId`/`source=musicbrainz`; `sources` + `enrichment` en la respuesta
- [x] `ArtistInfo` extendido: `externalIds`, `source`, `relationType`; bio/members/genres vía `enrichment`
- [x] UI mínima: bio con atribución en Overview, chips de enlaces externos, badges de fuente (perfil, discografía, influencias)
- [x] Discogs activo con `DISCOGS_TOKEN` (renombrado desde `DISCOGS_PERSONAL_TOKEN`); se desactiva solo si falta el token
- [x] Pruebas es/en: The Beatles, David Bowie, Pink Floyd (API + navegador con helium)
- [x] `pnpm typecheck && pnpm lint && pnpm build`

### 6.8 Notas de implementación (2026-10-09)

- **Sitelinks vía `wbgetentities`** (decisión confirmada): una llamada cacheada 6 h resuelve sitelinks en/es + P434/P1953/P1902/P3192/P1728 + descripción. Sin joins `schema:about`.
- **MusicBrainz**: el lookup de artista limita `inc=release-groups` a 25; la discografía usa el browse paginado por tipo (`album`/`single`/`ep`, 100 por página, 1 página por tipo). El *core* (1 request) alimenta influencias/colaboraciones/enriquecimiento y el completo (4 requests) la discografía.
- **Géneros MB**: solo se fusionan los géneros curados; los tags folksonómicos se descartan (ruido tipo `60s`, `uk`, vandalismo).
- **DBpedia ES**: por GET (el POST cuelga en es.dbpedia) y solo como *fallback* si Wikipedia no devolvió bio; el caso común no paga su latencia.
- **Merge de discografía**: clave fuerte `P436 ↔ release-group MB`; fallback título normalizado + año. Precedencia MB → Wikidata → Discogs con backfill de campos.
- **Pendiente para Fase 3**: sugerencias por similitud de género (nunca como influencia real), chips de `relationType`, visualización de `members`, y `auto` en el selector.

---

## 7. Fase 3 — UI y rendimiento ✅

- Selector "Fuente de datos" con **Auto** como opción por defecto; opciones explícitas (Wikidata / QLever / DBpedia) se mantienen para comparar y depurar.
- Badges de provenance en resultados y perfil; enlaces ancla a `/[lang]/data`.
- Render progresivo por sección (bio/discografía/relaciones llegan cuando están listas, sin bloquear el perfil).
- `useTransition` para cambio de tabs, `content-visibility` en listas largas, memoización de filas (guías Vercel).
- Mantener el sistema de diseño: Space Mono, dot grid, chips 2px, hairlines, sin gradientes/sombras; `prefers-reduced-motion`.

Entregado (2026-10-09):
- `SELECTABLE_PROVIDERS = [auto, wikidata, qlever, dbpedia]`; `HomeClient` arranca en `auto` y el footer acredita las 5 fuentes con enlaces.
- Badges de fuente por fila en resultados de búsqueda, discografía e influencias; el strip de procedencia del perfil enlaza a `/[lang]/data#<fuente>`.
- Carga independiente por sección (`settle()` por promesa): stats con "—" hasta que su sección está lista, skeleton solo en la tab activa, sin bloquear el perfil.
- `useTransition` en el cambio de tab (con `aria-busy`), `content-visibility: auto` (`.list-long` / `.list-long-cards`) y `memo()` en filas/tarjetas/grupos.
- Página `/[lang]/data` puente: título, intro, 5 secciones ancla y nota de "Fase 4" (la metodología completa — diagrama, límites y licencias — sigue siendo el alcance de Fase 4).
- Coalescing in-flight en `resolveArtistData` (el perfil lanza 4 acciones en paralelo; una sola llamada a wbgetentities en frío).

## 8. Fase 4 — Página de metodología `/[lang]/data` ✅

**Alcance previsto (cumplido):**
- Título: "Cómo se construyen los datos" / "How the data is built".
- Contenido: diagrama de flujo (SVG inline), tabla de proveedores y qué aporta cada uno, reglas del modo Auto (precedencia, dedupe, sugerencias vs. datos reales), transparencia de límites (WDQS 60 s/5 paralelas, parciales de Virtuoso, MB 1 req/s, Discogs 60 req/min), licencias (Wikidata CC0, DBpedia CC BY-SA, MusicBrainz data license, Wikipedia CC BY-SA, Discogs terms), nota de migración v2/QLever.
- Enlace desde footer y desde badges de fuente (anclas `#wikidata`, `#musicbrainz`, `#dbpedia`, `#discogs`, `#wikipedia`, `#auto`).
- i18n en `en.json` / `es.json`; server component; sin CLS; accesible.

**Entregado (2026-10-09):**
- `src/app/[lang]/data/page.tsx` reescrita como server component estático (cero JS de cliente) con `generateMetadata` i18n y secciones: flujo, reglas del modo Auto, fuentes, límites y migración v2.
- Diagrama de flujo SVG inline (`src/components/data/DataFlowDiagram.tsx`): 7 nodos / 7 conectores ortogonales con codos `r=8`, máscaras opacas, coral solo en `auto` y `merge + provenance`; tema claro/oscuro por tokens; `role="img"` + `title`/`desc` con ids prefijados; `overflow-x-auto` en móvil (sin overflow de página).
- Anclas completas: `#auto`, `#wikidata`, `#qlever`, `#wikipedia`, `#dbpedia`, `#musicbrainz`, `#discogs` (más `#flow`, `#sources`, `#limits`, `#v2`). Se corrigió el ancla rota `#qlever` (los badges de failover de `auto` enlazaban a una sección inexistente).
- `src/components/data/MethodologySection.tsx` y `MethodologyTable.tsx` (composición, sin boolean props): tablas semánticas con `<caption>` sr-only y `th[scope]`, scroll horizontal interno.
- Licencias por fuente con enlace externo; apuntes de precisión: la imagen solo usa `P18` de Wikidata (sin respaldos aún) y el nombre sale de la etiqueta de Wikidata con respaldo multilingüe.
- Footer de `HomeClient`: enlace interno a `/${locale}/data`.
- Upgrade previo a Next.js 16.4 (`9984d6f`, commit aislado): `next lint` → ESLint CLI con flat config nativo, `middleware.ts` → `proxy.ts`, `useSyncExternalStore` en `ThemeToggle`/`useSystemPrefersDark`, resets por evento en `ArtistProfile` (reglas `react-hooks` v6), `images.maximumRedirects: 5` para Wikimedia.
- Validado: `pnpm typecheck && pnpm lint && pnpm build` + navegador (helium) en `/en/data` y `/es/data`, claro/oscuro, 392px sin overflow, anclas presentes, cero errores de consola.

## 9. Fase 5 — v2 readiness ⏳

- Feature flag para cambiar el endpoint por defecto a `query-next.wikidata.org` cuando sea público (nov 2026).
- Probar el suite completo contra QLever y corregir diferencias (fechas estrictas, multiplicidad de labels).
- Monitoreo de latencias/429/parciales para decidir el corte antes de feb 2027.

---

## 10. Convenciones y validación

- **Obligatorio:** `pnpm typecheck && pnpm build` tras cada cambio de código.
- Commits en convención `feat|fix|chore|refactor|style(scope): mensaje`. **No commitear sin pedirlo** (hubo un commit accidental que se movió a la rama).
- i18n: toda clave nueva va en **ambos** diccionarios (`src/dictionaries/en.json` y `es.json`); el tipo `Dictionary` se deriva de `es.json`.
- Diseño: ver sección 1.1 de `AGENTS.md` (Space Mono, dot grid, un solo acento coral, radios ≤ 6px, iconos Lucide `strokeWidth=1.5`).
- Queries: seguir las decisiones de la sección 2. Cualquier query nueva debe funcionar en Blazegraph **y** QLever.
- Logs: prefijos `[SPARQL]`, `[API /sparql]`, `[wbsearch]` para diagnóstico.

### Smoke tests del API (ejemplo)

```bash
# Búsqueda con locale y proveedor
curl -s -X POST http://localhost:3000/api/sparql -H 'Content-Type: application/json' \
  -d '{"action":"searchArtist","params":{"name":"beatles","provider":"wikidata","lang":"en"}}'

# Discografía
curl -s -X POST http://localhost:3000/api/sparql -H 'Content-Type: application/json' \
  -d '{"action":"getArtistDiscography","params":{"artistId":"Q1299","provider":"qlever","lang":"es"}}'

# Colaboraciones (incluye workType)
curl -s -X POST http://localhost:3000/api/sparql -H 'Content-Type: application/json' \
  -d '{"action":"getCollaborations","params":{"artistId":"Q1299","provider":"wikidata","lang":"en"}}'
```

Acciones actuales: `searchArtist`, `getArtistDiscography`, `getArtistInfluences`, `getCollaborations`, `searchByGenre`, `getTopBands`, `getArtistEnrichment`. Params comunes: `provider`, `lang`, `mbid`, `discogsId`, `source` (`musicbrainz`).

---

## 11. Limitaciones conocidas y riesgos

| Riesgo | Mitigación actual / pendiente |
|---|---|
| WDQS throttling (60 s proceso/min, 5 paralelas/IP) | Caché + máx. 2–3 queries por vista; `auto` hace failover a QLever con timeouts 12 s/8 s |
| Parciales de Virtuoso (200 OK con datos incompletos) | Query ligera + lotes; logs de headers; no confiar en agregados de DBpedia |
| DBpedia sin álbumes/colaboraciones de muchos artistas | Wikidata/MusicBrainz son las fuentes reales; DBpedia solo enriquece |
| MusicBrainz 1 req/s | Cola + caché 24 h + timeout 8 s; nunca path crítico |
| qlever.dev es un endpoint comunitario | Usar como ensayo; oficial v2 llega nov 2026 |
| `auto` ya es el modo por defecto | Opciones explícitas se mantienen para comparar/depurar; failover WD→QLever con presupuesto de 12 s/8 s |
| Commits de Fase 3–4 y upgrade a Next 16 sin pushear | `git push` cuando el usuario lo indique |

## 12. Estado de git

```
feat/data-enrichment (actual, upstream configurado)
  ├─ Fase 4 completa (ver §8) + upgrade Next 16  [sin pushear]
  ├─ 9984d6f chore(deps): upgrade to Next.js 16
  ├─ e976d17 feat(ui): auto mode by default with progressive profile rendering [pusheado]
  ├─ 03f84a4 feat(enrichment): multi-source auto mode with provenance      [pusheado]
  ├─ 0e7c880 fix(discography): dedupe releases to avoid duplicate React keys  [pusheado]
  └─ 27acad8 feat: add featured artist IDs and remove unused SPARQL queries   [pusheado]

main = 596595f (restaurado, force-push a origin)
```
