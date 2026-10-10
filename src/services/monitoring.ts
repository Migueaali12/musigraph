// ── In-memory endpoint monitoring ──────────────────────────────────────────
// Per-server-instance metrics used to decide the WDQS v1 → v2 cutover:
// latencies (avg/p95), throttling (429/502/503/504), timeouts and Virtuoso
// partial responses. Read-only snapshot exposed by GET /api/health.
//
// Server-only. Metrics are ephemeral (they reset per instance/restart), which
// matches the rest of the server caches in this app.

const MAX_SAMPLES = 200
const MAX_EVENTS = 20

export type FailureKind = "timeout" | "http" | "network"

export interface MonitoringEvent {
  at: string
  kind: "ok" | "partial" | "throttled" | FailureKind
  latencyMs?: number
  detail?: string
}

interface EndpointStats {
  requests: number
  ok: number
  partials: number
  throttled: number
  timeouts: number
  errors: number
  totalOkLatencyMs: number
  lastLatencyMs: number | null
  samples: number[]
  lastError: string | null
  lastEventAt: string | null
  events: MonitoringEvent[]
}

export interface EndpointMetricsSnapshot {
  requests: number
  ok: number
  partials: number
  throttled: number
  timeouts: number
  errors: number
  avgLatencyMs: number | null
  p95LatencyMs: number | null
  lastLatencyMs: number | null
  lastError: string | null
  lastEventAt: string | null
  recentEvents: MonitoringEvent[]
}

const registry = new Map<string, EndpointStats>()

function statsFor(key: string): EndpointStats {
  let stats = registry.get(key)
  if (!stats) {
    stats = {
      requests: 0,
      ok: 0,
      partials: 0,
      throttled: 0,
      timeouts: 0,
      errors: 0,
      totalOkLatencyMs: 0,
      lastLatencyMs: null,
      samples: [],
      lastError: null,
      lastEventAt: null,
      events: [],
    }
    registry.set(key, stats)
  }
  return stats
}

function pushEvent(stats: EndpointStats, event: MonitoringEvent): void {
  stats.lastEventAt = event.at
  stats.events.unshift(event)
  if (stats.events.length > MAX_EVENTS) stats.events.pop()
}

export function recordSparqlSuccess(
  key: string,
  latencyMs: number,
  partial = false
): void {
  const stats = statsFor(key)
  stats.requests += 1
  stats.ok += 1
  stats.totalOkLatencyMs += latencyMs
  stats.lastLatencyMs = latencyMs
  stats.samples.push(latencyMs)
  if (stats.samples.length > MAX_SAMPLES) stats.samples.shift()
  if (partial) stats.partials += 1
  pushEvent(stats, {
    at: new Date().toISOString(),
    kind: partial ? "partial" : "ok",
    latencyMs,
  })
}

export function recordSparqlThrottle(
  key: string,
  status: number,
  latencyMs: number
): void {
  const stats = statsFor(key)
  stats.requests += 1
  stats.throttled += 1
  pushEvent(stats, {
    at: new Date().toISOString(),
    kind: "throttled",
    latencyMs,
    detail: `HTTP ${status}`,
  })
}

export function recordSparqlFailure(
  key: string,
  kind: FailureKind,
  latencyMs: number,
  detail?: string
): void {
  const stats = statsFor(key)
  stats.requests += 1
  if (kind === "timeout") stats.timeouts += 1
  else stats.errors += 1
  stats.lastError = detail ?? kind
  pushEvent(stats, {
    at: new Date().toISOString(),
    kind,
    latencyMs,
    detail,
  })
}

function percentile(samples: number[], p: number): number | null {
  if (samples.length === 0) return null
  const sorted = [...samples].sort((a, b) => a - b)
  const index = Math.min(Math.ceil(p * sorted.length) - 1, sorted.length - 1)
  return sorted[index]
}

export function snapshotMetrics(): Record<string, EndpointMetricsSnapshot> {
  const snapshot: Record<string, EndpointMetricsSnapshot> = {}

  for (const [key, stats] of registry) {
    snapshot[key] = {
      requests: stats.requests,
      ok: stats.ok,
      partials: stats.partials,
      throttled: stats.throttled,
      timeouts: stats.timeouts,
      errors: stats.errors,
      avgLatencyMs:
        stats.ok > 0 ? Math.round(stats.totalOkLatencyMs / stats.ok) : null,
      p95LatencyMs: percentile(stats.samples, 0.95),
      lastLatencyMs: stats.lastLatencyMs,
      lastError: stats.lastError,
      lastEventAt: stats.lastEventAt,
      recentEvents: stats.events,
    }
  }

  return snapshot
}
