import type { Lang, ProviderInfo } from "./providers"
import type { SparqlResponse } from "./sparqlTypes"
import { executeSparqlQuery } from "./sparqlExecutor"
import { buildBatchLabelsQuery, buildWorkTypeQuery } from "./queries/wikidata"

// ── Batched post-processing for engines without a label service ────────────
// One VALUES pass resolves every entity of a result set (QLever, Virtuoso).

export interface LabelTarget {
  entityVar: string
  labelVar: string
  descriptionVar?: string
}

export const SEARCH_LABEL_TARGETS: LabelTarget[] = [
  { entityVar: "artist", labelVar: "artistLabel", descriptionVar: "artistDescription" },
  { entityVar: "country", labelVar: "countryLabel" },
  { entityVar: "genre", labelVar: "genreLabel" },
  { entityVar: "instrument", labelVar: "instrumentLabel" },
  { entityVar: "instanceType", labelVar: "instanceTypeLabel" },
  { entityVar: "occupation", labelVar: "occupationLabel" },
]

export const DISCOGRAPHY_LABEL_TARGETS: LabelTarget[] = [
  { entityVar: "album", labelVar: "albumLabel" },
  { entityVar: "label", labelVar: "labelLabel" },
  { entityVar: "genre", labelVar: "genreLabel" },
  { entityVar: "albumType", labelVar: "albumTypeLabel" },
]

export const DBPEDIA_DISCOGRAPHY_LABEL_TARGETS: LabelTarget[] = [
  { entityVar: "album", labelVar: "albumLabel" },
  { entityVar: "label", labelVar: "labelLabel" },
  { entityVar: "genre", labelVar: "genreLabel" },
]

export const INFLUENCE_LABEL_TARGETS: LabelTarget[] = [
  { entityVar: "influence", labelVar: "influenceLabel" },
  { entityVar: "country", labelVar: "countryLabel" },
  { entityVar: "genre", labelVar: "genreLabel" },
]

export const COLLABORATION_LABEL_TARGETS: LabelTarget[] = [
  { entityVar: "work", labelVar: "workLabel" },
  { entityVar: "collaborator", labelVar: "collaboratorLabel" },
]

/** Resolve labels (and optionally descriptions) for every entity in result sets. */
export async function attachLabels(
  responses: SparqlResponse[],
  targets: LabelTarget[],
  lang: Lang,
  provider: ProviderInfo
): Promise<void> {
  const bindings = responses.flatMap((response) => response.results.bindings)
  const entities = new Set<string>()

  for (const row of bindings) {
    for (const target of targets) {
      const value = row[target.entityVar]?.value
      if (value?.startsWith("http")) entities.add(value)
    }
  }
  if (entities.size === 0) return

  const needsDescriptions = targets.some((target) => target.descriptionVar)

  try {
    const query = buildBatchLabelsQuery([...entities], lang, {
      descriptions: needsDescriptions,
    })
    const labelResponse = await executeSparqlQuery(query, provider)

    const resolved = new Map<string, { label?: string; description?: string }>()
    for (const row of labelResponse.results.bindings) {
      const uri = row.entity?.value
      if (!uri) continue
      const entry = resolved.get(uri) ?? {}
      if (!entry.label && row.entityLabel?.value) entry.label = row.entityLabel.value
      if (!entry.description && row.entityDescription?.value) {
        entry.description = row.entityDescription.value
      }
      resolved.set(uri, entry)
    }

    for (const row of bindings) {
      for (const target of targets) {
        const uri = row[target.entityVar]?.value
        const hit = uri ? resolved.get(uri) : undefined
        if (!hit) continue
        if (hit.label && !row[target.labelVar]) {
          row[target.labelVar] = { type: "literal", value: hit.label, "xml:lang": lang }
        }
        if (target.descriptionVar && hit.description && !row[target.descriptionVar]) {
          row[target.descriptionVar] = {
            type: "literal",
            value: hit.description,
            "xml:lang": lang,
          }
        }
      }
    }
  } catch (err) {
    // Labels are an enhancement: never fail the whole request over them.
    console.warn(
      `[SPARQL] label batch failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/** Classify collaboration works as songs or albums in a batched pass. */
export async function attachWorkTypes(
  response: SparqlResponse,
  entityVar: string,
  provider: ProviderInfo
): Promise<void> {
  const bindings = response.results.bindings
  const works = [
    ...new Set(
      bindings
        .map((row) => row[entityVar]?.value)
        .filter((value): value is string => Boolean(value?.startsWith("http")))
    ),
  ]
  if (works.length === 0) return

  try {
    const typeResponse = await executeSparqlQuery(buildWorkTypeQuery(works), provider)
    const albumWorks = new Set(
      typeResponse.results.bindings
        .map((row) => row.entity?.value)
        .filter((value): value is string => Boolean(value))
    )
    for (const row of bindings) {
      const uri = row[entityVar]?.value
      if (!uri) continue
      // Anything not returned by the release-type query is a song.
      row.workType = { type: "literal", value: albumWorks.has(uri) ? "album" : "song" }
    }
  } catch (err) {
    console.warn(
      `[SPARQL] work-type batch failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export function mergeResponses(responses: SparqlResponse[]): SparqlResponse {
  return {
    results: {
      bindings: responses.flatMap((response) => response.results.bindings),
    },
  }
}
