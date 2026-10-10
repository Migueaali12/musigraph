import type { Metadata } from "next"
import Link from "next/link"
import { getDictionary, type Locale } from "@/dictionaries/getDictionary"
import { SOURCE_LABELS, type SourceId } from "@/services/sources"
import { DataFlowDiagram } from "@/components/data/DataFlowDiagram"
import { MethodologySection } from "@/components/data/MethodologySection"
import { MethodologyTable } from "@/components/data/MethodologyTable"

// ── Methodology page ───────────────────────────────────────────────────────
// Static server component: flow diagram, Auto mode rules, per-source detail
// (anchor targets for the provenance badges), API limits and the WDQS v2
// migration note. No client JS, no data fetching, no CLS.

interface DataPageProps {
  params: Promise<{ lang: string }>
}

/** Sources detailed on the page, in reading order. Every SourceId needs an
 *  entry in `dict.data.sources.details` or TypeScript fails the build. */
const SOURCE_ORDER: readonly SourceId[] = [
  "wikidata",
  "qlever",
  "wikipedia",
  "dbpedia",
  "musicbrainz",
  "discogs",
]

const metaLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.14em] text-muted"

export async function generateMetadata({
  params,
}: DataPageProps): Promise<Metadata> {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale)

  return {
    title: dict.data.metaTitle,
    description: dict.data.metaDescription,
    alternates: {
      languages: {
        en: "/en/data",
        es: "/es/data",
      },
    },
  }
}

export default async function DataPage({ params }: DataPageProps) {
  const { lang } = await params
  const locale = lang as Locale
  const dict = await getDictionary(locale)
  const { data } = dict

  const tabsSub = [
    dict.artist.overview,
    dict.artist.discography,
    dict.artist.influencesTab,
    dict.artist.collaborationsTab,
  ].join(" · ")

  return (
    <main className='mx-auto max-w-3xl px-4 py-14 sm:px-6'>
      <Link href={`/${locale}`} className='control'>
        {data.back}
      </Link>

      <header className='mt-8'>
        <p className={metaLabelClass}>{data.eyebrow}</p>
        <h1 className='mt-2 text-3xl font-bold tracking-tight sm:text-4xl'>
          {data.title}
        </h1>
        <p className='mt-4 max-w-prose text-[15px] leading-relaxed text-muted'>
          {data.intro}
        </p>
      </header>

      <div className='mt-12 space-y-10'>
        <MethodologySection
          id='flow'
          title={data.flow.title}
          intro={data.flow.caption}
        >
          <div className='overflow-x-auto rounded-md border border-border bg-surface p-4 sm:p-6'>
            <DataFlowDiagram
              title={data.flow.diagramTitle}
              desc={data.flow.diagramDesc}
              labels={{ ...data.flow.labels, tabsSub }}
            />
          </div>
        </MethodologySection>

        <MethodologySection
          id='auto'
          title={data.autoRules.title}
          intro={data.autoRules.intro}
        >
          <MethodologyTable
            caption={data.autoRules.caption}
            columns={[data.autoRules.columns.field, data.autoRules.columns.order]}
            rows={data.autoRules.rows.map((row) => ({
              key: row.field,
              cells: [row.field, row.order],
            }))}
          />

          <div className='mt-8 space-y-6'>
            <div>
              <h3 className='text-base font-bold'>
                {data.autoRules.dedupeTitle}
              </h3>
              <p className='mt-2 max-w-prose text-[13px] leading-relaxed text-muted'>
                {data.autoRules.dedupe}
              </p>
            </div>
            <div>
              <h3 className='text-base font-bold'>
                {data.autoRules.statusesTitle}
              </h3>
              <p className='mt-2 max-w-prose text-[13px] leading-relaxed text-muted'>
                {data.autoRules.statuses}
              </p>
            </div>
          </div>
        </MethodologySection>

        <MethodologySection
          id='sources'
          title={data.sources.title}
          intro={data.sources.intro}
        >
          <div className='border-t border-border'>
            {SOURCE_ORDER.map((source) => {
              const detail = data.sources.details[source]

              return (
                <article
                  key={source}
                  id={source}
                  className='scroll-mt-24 border-b border-border py-6'
                >
                  <h3 className='text-base font-bold'>{SOURCE_LABELS[source]}</h3>

                  <dl className='mt-3 space-y-3 text-[13px] leading-relaxed'>
                    <div className='grid gap-1 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-x-4'>
                      <dt className={metaLabelClass}>
                        {data.sources.labels.role}
                      </dt>
                      <dd className='text-muted'>{detail.role}</dd>
                    </div>

                    <div className='grid gap-1 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-x-4'>
                      <dt className={metaLabelClass}>
                        {data.sources.labels.endpoint}
                      </dt>
                      <dd className='break-all text-muted'>{detail.endpoint}</dd>
                    </div>

                    <div className='grid gap-1 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-x-4'>
                      <dt className={metaLabelClass}>
                        {data.sources.labels.license}
                      </dt>
                      <dd className='text-muted'>
                        <a
                          href={detail.licenseUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='link text-accent'
                        >
                          {detail.license}
                        </a>
                      </dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>
        </MethodologySection>

        <MethodologySection
          id='limits'
          title={data.limits.title}
          intro={data.limits.intro}
        >
          <MethodologyTable
            caption={data.limits.caption}
            columns={[
              data.limits.columns.source,
              data.limits.columns.limit,
              data.limits.columns.mitigation,
            ]}
            rows={data.limits.rows.map((row) => ({
              key: row.source,
              cells: [row.source, row.limit, row.mitigation],
            }))}
          />
        </MethodologySection>

        <MethodologySection id='v2' title={data.v2.title} intro={data.v2.body} />
      </div>
    </main>
  )
}
