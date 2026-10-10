import { NextResponse, type NextRequest } from "next/server"
import { PROVIDERS } from "@/services/providers"
import {
  getEndpointConfig,
  getSparqlTargets,
  resolveSparqlTarget,
} from "@/services/endpoints"
import { snapshotMetrics } from "@/services/monitoring"
import { executeSparqlQuery } from "@/services/sparqlExecutor"
import { TtlCache } from "@/services/serverCache"

// ── Health & endpoint monitoring ───────────────────────────────────────────
// GET /api/health          → endpoint metrics snapshot + resolved config.
// GET /api/health?probe=1  → also runs a tiny indexed query against each
//                            SPARQL engine (cached 60 s) to measure live
//                            latency for the WDQS v1 → v2 cutover decision.
//
// No secrets are exposed and metrics are per-server-instance (ephemeral).

export const dynamic = "force-dynamic"

interface ProbeResult {
  ok: boolean
  latencyMs: number
  error?: string
}

type ProbeResults = Record<string, ProbeResult>

const PROBE_TIMEOUT_MS = 4_000
const probeCache = new TtlCache<ProbeResults>(2, 60_000)

// Indexed probes only: no full scans, cheap enough for the public quotas.
const WIKIDATA_PROBE =
  "SELECT * WHERE { <http://www.wikidata.org/entity/Q42> <http://www.wikidata.org/prop/direct/P31> ?o } LIMIT 1"
const DBPEDIA_PROBE =
  "SELECT * WHERE { <http://dbpedia.org/resource/The_Beatles> ?p ?o } LIMIT 1"

async function runProbes(): Promise<ProbeResults> {
  const engines = [
    { provider: PROVIDERS.wikidata, query: WIKIDATA_PROBE },
    { provider: PROVIDERS.qlever, query: WIKIDATA_PROBE },
    { provider: PROVIDERS.dbpedia, query: DBPEDIA_PROBE },
  ]

  const results: ProbeResults = {}

  await Promise.all(
    engines.map(async ({ provider, query }) => {
      const target = resolveSparqlTarget(provider)
      const start = Date.now()
      try {
        await executeSparqlQuery(query, provider, {
          timeoutMs: PROBE_TIMEOUT_MS,
          retries: 0,
          recordMetrics: false,
        })
        results[target.key] = { ok: true, latencyMs: Date.now() - start }
      } catch (err) {
        results[target.key] = {
          ok: false,
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    })
  )

  return results
}

export async function GET(request: NextRequest) {
  const wantsProbe = request.nextUrl.searchParams.get("probe") === "1"

  const config = {
    ...getEndpointConfig(),
    targets: getSparqlTargets().map(({ key, url }) => ({ key, url })),
  }

  let probe: ProbeResults | undefined
  if (wantsProbe) {
    probe = probeCache.get("probe")
    if (!probe) {
      probe = await runProbes()
      probeCache.set("probe", probe)
    }
  }

  return NextResponse.json({
    status: probe && Object.values(probe).some((result) => !result.ok)
      ? "degraded"
      : "ok",
    generatedAt: new Date().toISOString(),
    config,
    endpoints: snapshotMetrics(),
    ...(probe ? { probe, probeCachedForMs: 60_000 } : {}),
  })
}
