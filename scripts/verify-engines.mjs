#!/usr/bin/env node
// ── Engine parity smoke test (WDQS v1 · QLever · DBpedia · auto) ───────────
// Usage:   node scripts/verify-engines.mjs [baseUrl]
// Default: http://localhost:3000 (requires a running server: pnpm dev)
//
// Hits the real /api/sparql API for every engine/action pair the app uses,
// reports latency, row counts, distinct counts and duplicate warnings, and
// prints the monitoring snapshot from /api/health. Exit code 1 when any
// request fails. Use it to validate the QLever failover path and to decide
// the WDQS v2 cutover (phase 5 of plans/data-enrichment.md).
//
// Notes on duplicates: the explicit-provider API returns raw bindings (one
// row per label/genre combination), and the client merges them. Only
// *exact* duplicate rows are noise. The `auto` discography is merged
// server-side, so there the album-key dedupe is a hard expectation.

const BASE_URL = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "")
const REQUEST_TIMEOUT_MS = 30_000

const ARTIST = { id: "Q1299", name: "The Beatles" }
const ROCK_GENRE = "Q11399"

const CASES = [
  { label: "searchArtist", provider: "wikidata", action: "searchArtist", params: { name: ARTIST.name, lang: "en" }, minRows: 3 },
  { label: "searchArtist", provider: "qlever", action: "searchArtist", params: { name: ARTIST.name, lang: "en" }, minRows: 3 },
  { label: "searchArtist", provider: "auto", action: "searchArtist", params: { name: ARTIST.name, lang: "es" }, minRows: 3 },
  { label: "searchArtist", provider: "dbpedia", action: "searchArtist", params: { name: ARTIST.name, lang: "en" }, minRows: 1 },
  { label: "discography", provider: "wikidata", action: "getArtistDiscography", params: { artistId: ARTIST.id, lang: "en" }, minRows: 10, distinctBy: "albumLabel" },
  { label: "discography", provider: "qlever", action: "getArtistDiscography", params: { artistId: ARTIST.id, lang: "en" }, minRows: 10, distinctBy: "albumLabel" },
  { label: "discography", provider: "auto", action: "getArtistDiscography", params: { artistId: ARTIST.id, lang: "es" }, minRows: 10, uniqueBy: "albumLabel", distinctBy: "albumLabel" },
  { label: "influences", provider: "wikidata", action: "getArtistInfluences", params: { artistId: ARTIST.id, lang: "en" }, minRows: 1, distinctBy: "influenceLabel" },
  { label: "influences", provider: "qlever", action: "getArtistInfluences", params: { artistId: ARTIST.id, lang: "en" }, minRows: 1, distinctBy: "influenceLabel" },
  { label: "collaborations", provider: "wikidata", action: "getCollaborations", params: { artistId: ARTIST.id, lang: "en" }, minRows: 1, distinctBy: "collaboratorLabel" },
  { label: "collaborations", provider: "qlever", action: "getCollaborations", params: { artistId: ARTIST.id, lang: "en" }, minRows: 1, distinctBy: "collaboratorLabel" },
  { label: "searchByGenre rock", provider: "wikidata", action: "searchByGenre", params: { genreId: ROCK_GENRE, lang: "en" }, minRows: 5 },
  { label: "searchByGenre rock", provider: "qlever", action: "searchByGenre", params: { genreId: ROCK_GENRE, lang: "en" }, minRows: 5 },
  { label: "topBands", provider: "wikidata", action: "getTopBands", params: { lang: "en" }, minRows: 5 },
  { label: "topBands", provider: "qlever", action: "getTopBands", params: { lang: "en" }, minRows: 5 },
]

async function callApi(action, params) {
  const start = Date.now()
  const res = await fetch(`${BASE_URL}/api/sparql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const ms = Date.now() - start

  let body = null
  try {
    body = await res.json()
  } catch {
    // non-JSON body (proxy error, gateway timeout)
  }

  return { ok: res.ok, status: res.status, ms, body }
}

function yearOf(value) {
  const match = /^(\d{4})/.exec(value ?? "")
  return match ? match[1] : ""
}

function inspect(caseDef, body) {
  const warnings = []
  const bindings = body?.results?.bindings ?? []

  if (caseDef.minRows !== undefined && bindings.length < caseDef.minRows) {
    warnings.push(`expected ≥${caseDef.minRows} rows, got ${bindings.length}`)
  }

  // Exact duplicate rows are always noise.
  const fingerprints = new Set()
  let exactDuplicates = 0
  for (const row of bindings) {
    const fingerprint = JSON.stringify(row)
    if (fingerprints.has(fingerprint)) exactDuplicates += 1
    fingerprints.add(fingerprint)
  }
  if (exactDuplicates > 0) {
    warnings.push(`${exactDuplicates} exact duplicate row(s)`)
  }

  // Server-side merged output (auto) must dedupe by album key.
  if (caseDef.uniqueBy) {
    const seen = new Set()
    let duplicates = 0
    for (const row of bindings) {
      const key = `${row[caseDef.uniqueBy]?.value ?? ""}|${yearOf(row.releaseDate?.value)}`
      if (seen.has(key)) duplicates += 1
      seen.add(key)
    }
    if (duplicates > 0) {
      warnings.push(`${duplicates} duplicate ${caseDef.uniqueBy} key(s)`)
    }
  }

  for (const row of bindings) {
    const date = row.releaseDate?.value ?? row.birthDate?.value
    if (date && !/^\d{4}/.test(date)) {
      warnings.push(`unparsable date "${date}"`)
      break
    }
  }

  const distinct = caseDef.distinctBy
    ? new Set(bindings.map((row) => row[caseDef.distinctBy]?.value)).size
    : null

  return { warnings, distinct }
}

async function main() {
  console.log(`\nEngine parity smoke test → ${BASE_URL}\n`)

  const results = []
  for (const caseDef of CASES) {
    const params = { ...caseDef.params, provider: caseDef.provider }
    let outcome
    try {
      outcome = await callApi(caseDef.action, params)
    } catch (err) {
      outcome = {
        ok: false,
        status: 0,
        ms: 0,
        body: null,
        fatal: err instanceof Error ? err.message : String(err),
      }
    }

    const { warnings, distinct } =
      outcome.ok && outcome.body ? inspect(caseDef, outcome.body) : { warnings: [], distinct: null }
    const rows = outcome.body?.results?.bindings?.length ?? 0
    results.push({ caseDef, outcome, rows, warnings, distinct })
  }

  let failures = 0
  for (const { caseDef, outcome, rows, warnings, distinct } of results) {
    const passed = outcome.ok && warnings.length === 0
    if (!passed && !outcome.ok) failures += 1
    const status = outcome.ok ? (warnings.length === 0 ? "PASS" : "WARN") : "FAIL"
    const detail = outcome.fatal ?? `HTTP ${outcome.status}`
    const rowsText = `rows=${String(rows).padStart(4)}${distinct !== null ? ` distinct=${String(distinct).padStart(4)}` : ""}`
    const suffix = warnings.length > 0 ? ` — ${warnings.join("; ")}` : ""
    console.log(
      `${status}  ${caseDef.label.padEnd(20)} ${caseDef.provider.padEnd(9)} ${String(outcome.ms).padStart(6)}ms  ${rowsText}${outcome.ok ? "" : `  ${detail}`}${suffix}`
    )
  }

  try {
    const health = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = await health.json()
    console.log(`\nHealth: ${body.status} · wikidata=${body.config.wikidataMode}`)
    for (const [key, metrics] of Object.entries(body.endpoints ?? {})) {
      console.log(
        `  ${key.padEnd(10)} requests=${metrics.requests} ok=${metrics.ok} throttled=${metrics.throttled} timeouts=${metrics.timeouts} errors=${metrics.errors} avg=${metrics.avgLatencyMs ?? "—"}ms p95=${metrics.p95LatencyMs ?? "—"}ms partials=${metrics.partials}`
      )
    }
  } catch {
    console.log("\nHealth: /api/health not reachable (skipped)")
  }

  console.log(
    `\n${results.length - failures}/${results.length} requests OK${failures > 0 ? ` — ${failures} failed` : ""}\n`
  )
  process.exit(failures > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
