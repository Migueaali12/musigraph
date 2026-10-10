import Link from "next/link"
import { getDictionary, type Locale } from "@/dictionaries/getDictionary"
import { SOURCE_LABELS } from "@/services/sources"

// ── Methodology page ───────────────────────────────────────────────────────
// Minimal bridge for Phase 3: hosts the per-source anchor sections linked from
// the provenance badges. Phase 4 expands it with the flow diagram, API limits
// and licenses.

const SOURCE_IDS = ["wikidata", "wikipedia", "dbpedia", "musicbrainz", "discogs"] as const

interface DataPageProps {
  params: Promise<{ lang: string }>
}

export default async function DataPage({ params }: DataPageProps) {
  const { lang } = await params
  const locale = lang as Locale
  const dict = await getDictionary(locale)

  return (
    <main className='mx-auto max-w-3xl px-4 py-14 sm:px-6'>
      <Link href={`/${locale}`} className='control'>
        {dict.data.back}
      </Link>

      <h1 className='mt-8 text-3xl font-bold tracking-tight sm:text-4xl'>
        {dict.data.title}
      </h1>
      <p className='mt-4 max-w-prose text-[15px] leading-relaxed text-muted'>
        {dict.data.intro}
      </p>

      <ul className='mt-10 divide-y divide-border border-y border-border'>
        {SOURCE_IDS.map((source) => (
          <li key={source} id={source} className='scroll-mt-24 py-5'>
            <h2 className='text-sm font-bold'>{SOURCE_LABELS[source]}</h2>
            <p className='mt-1.5 max-w-prose text-[13px] leading-relaxed text-muted'>
              {dict.data.sources[source]}
            </p>
          </li>
        ))}
      </ul>

      <p className='mt-8 text-[13px] text-muted'>{dict.data.pending}</p>
    </main>
  )
}
