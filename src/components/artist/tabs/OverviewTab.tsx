import type { ArtistInfo } from "@/services/sparqlService"
import type { ProcessedArtistData } from "@/services/dataProcessor"
import type { ArtistBio } from "@/services/sparqlTypes"
import { sourceAnchorHref, type SourceId, type SourceStatusMap } from "@/services/sources"
import { SourceBadge } from "@/components/common/SourceBadge"
import { extractYear } from "@/utils/date"
import type { Dictionary, Locale } from "@/dictionaries/getDictionary"

type SectionStatus = "loading" | "ready"

interface OverviewTabProps {
  artist: ArtistInfo
  processedData: ProcessedArtistData
  bio?: ArtistBio
  sources?: SourceStatusMap
  enrichmentStatus: SectionStatus
  statsStatus: {
    discography: SectionStatus
    influences: SectionStatus
    collaborations: SectionStatus
  }
  locale: Locale
  dict: Dictionary
}

export function OverviewTab({
  artist,
  processedData,
  bio,
  sources,
  enrichmentStatus,
  statsStatus,
  locale,
  dict,
}: OverviewTabProps) {
  const countryPart = artist.country
    ? dict.artist.overviewDescriptionCountry.replace("{country}", artist.country)
    : ""
  const birthYear = extractYear(artist.birthDate)
  const activePart =
    birthYear !== null
      ? dict.artist.overviewDescriptionActive.replace("{year}", String(birthYear))
      : ""
  const genresPart =
    artist.genres.length > 0
      ? dict.artist.overviewDescriptionGenres.replace(
          "{genres}",
          artist.genres.slice(0, 3).join(", ")
        )
      : ""

  const stats = [
    {
      value: processedData.statistics.totalAlbums,
      status: statsStatus.discography,
      label: dict.artist.statAlbums,
    },
    {
      value: processedData.statistics.totalInfluences,
      status: statsStatus.influences,
      label: dict.artist.statInfluences,
    },
    {
      value: processedData.statistics.totalCollaborations,
      status: statsStatus.collaborations,
      label: dict.artist.statCollaborations,
    },
  ]

  const provenance = sources
    ? (Object.entries(sources) as [SourceId, NonNullable<SourceStatusMap[SourceId]>][])
    : []

  return (
    <div className='space-y-8'>
      <p className='max-w-prose text-[15px] leading-relaxed text-muted'>
        {dict.artist.overviewDescription
          .replace("{name}", artist.name)
          .replace("{country}", countryPart)
          .replace("{activeSince}", activePart)
          .replace("{genres}", genresPart)}
      </p>

      {enrichmentStatus === "loading" ? (
        <div aria-hidden='true' className='max-w-prose space-y-2'>
          <div className='h-4 w-full animate-pulse rounded-xs bg-surface-elevated' />
          <div className='h-4 w-11/12 animate-pulse rounded-xs bg-surface-elevated' />
          <div className='h-4 w-2/3 animate-pulse rounded-xs bg-surface-elevated' />
        </div>
      ) : bio ? (
        <section>
          <p className='max-w-prose text-[15px] leading-relaxed'>{bio.text}</p>
          <p className='mt-2 text-xs text-muted'>
            {dict.artist.sourceLabel}{" "}
            {bio.url ? (
              <a
                href={bio.url}
                target='_blank'
                rel='noopener noreferrer'
                className='link text-accent'
              >
                {bio.source === "wikipedia"
                  ? "Wikipedia"
                  : bio.source === "dbpedia"
                    ? "DBpedia"
                    : "Wikidata"}
              </a>
            ) : (
              <span>
                {bio.source === "wikipedia"
                  ? "Wikipedia"
                  : bio.source === "dbpedia"
                    ? "DBpedia"
                    : "Wikidata"}
              </span>
            )}
          </p>
        </section>
      ) : null}

      {enrichmentStatus === "ready" && provenance.length > 0 && (
        <section>
          <h2 className='text-[10px] font-bold uppercase tracking-[0.14em] text-muted'>
            {dict.artist.dataSources}
          </h2>
          <div className='mt-2 flex flex-wrap gap-1.5'>
            {provenance.map(([source, status]) => (
              <SourceBadge
                key={source}
                source={source}
                status={status}
                href={sourceAnchorHref(locale, source)}
              />
            ))}
          </div>
        </section>
      )}

      <ul className='grid grid-cols-3 divide-x divide-border border-y border-border'>
        {stats.map((stat) => (
          <li key={stat.label} className='px-2 py-6 text-center'>
            <p className='text-2xl font-bold sm:text-3xl'>
              {stat.status === "ready" ? stat.value : "—"}
            </p>
            <p className='mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted sm:text-[11px]'>
              {stat.label}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
