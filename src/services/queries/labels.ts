import type { Lang } from "../providers"

// ── Language-aware label helpers ───────────────────────────────────────────
//
// WDQS v1 (Blazegraph) resolves labels with the wikibase:label service.
// WDQS v2 (QLever) and DBpedia (Virtuoso) do not support that service, so the
// same information is fetched with explicit OPTIONAL + COALESCE blocks.
// Both strategies project the same variable names, so consumers are identical.

const MUL = "mul"

/** Language fallback chain: requested language, then the other app language, then "mul". */
export function languageChain(lang: Lang): string[] {
  return lang === "es" ? ["es", "en", MUL] : ["en", "es", MUL]
}

/** Language chain without "mul" (descriptions never carry a mul tag). */
export function descriptionChain(lang: Lang): string[] {
  return lang === "es" ? ["es", "en"] : ["en", "es"]
}

/** Blazegraph-only: language priority handled by the label service. */
export function labelServiceBlock(lang: Lang): string {
  return `SERVICE wikibase:label { bd:serviceParam wikibase:language "${languageChain(lang).join(",")}". }`
}

/**
 * SPARQL 1.1 label resolution for a bound variable.
 * `target` is a variable with "?" (e.g. "?artist"); `alias` is a bare name.
 */
export function labelBlocks(
  target: string,
  alias: string,
  lang: Lang,
  property: string = "rdfs:label",
  codes: string[] = languageChain(lang)
): string {
  const blocks = codes.map(
    (code, index) =>
      `OPTIONAL { ${target} ${property} ?${alias}${index} . FILTER(lang(?${alias}${index}) = "${code}") }`
  )
  const fallbacks = codes.map((_, index) => `?${alias}${index}`).join(", ")
  blocks.push(`BIND(COALESCE(${fallbacks}) AS ?${alias})`)
  return blocks.join("\n  ")
}
