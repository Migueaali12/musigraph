import { TtlCache } from "../serverCache"
import type { Lang } from "../providers"

// ── Wikipedia REST summaries ───────────────────────────────────────────────
// Bios come from the sitelink of the UI language (falling back to the other
// app language). Attribution is mandatory in the UI (CC BY-SA).

export interface WikipediaSummary {
  extract: string
  url?: string
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const cache = new TtlCache<WikipediaSummary | null>(300, CACHE_TTL_MS)
const USER_AGENT = "MusiGraph/1.0 (https://musigraph.app)"

export async function getWikipediaSummary(
  lang: Lang,
  title: string
): Promise<WikipediaSummary | null> {
  const key = `${lang}:${title}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const path = encodeURIComponent(title.replace(/ /g, "_"))
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${path}?redirect=true`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6_000)
  const start = Date.now()

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    })

    if (res.status === 404) {
      cache.set(key, null)
      return null
    }
    if (!res.ok) throw new Error(`Wikipedia error: ${res.status}`)

    const data = (await res.json()) as {
      extract?: string
      type?: string
      content_urls?: { desktop?: { page?: string } }
    }

    if (!data.extract || data.type === "disambiguation") {
      cache.set(key, null)
      return null
    }

    const summary: WikipediaSummary = {
      extract: data.extract,
      url: data.content_urls?.desktop?.page,
    }
    cache.set(key, summary)
    console.log(`[enrichment] wikipedia ${lang}:"${title}" in ${Date.now() - start} ms`)
    return summary
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Wikipedia summary timed out")
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
