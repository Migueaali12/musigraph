import type { ArtistInfo } from "@/services/sparqlService"
import type { ProcessedArtistData } from "@/services/dataProcessor"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface OverviewTabProps {
  artist: ArtistInfo
  processedData: ProcessedArtistData
  dict: Dictionary
}

export function OverviewTab({ artist, processedData, dict }: OverviewTabProps) {
  const countryPart = artist.country
    ? dict.artist.overviewDescriptionCountry.replace("{country}", artist.country)
    : ""
  const activePart = artist.birthDate
    ? dict.artist.overviewDescriptionActive.replace(
        "{year}",
        String(new Date(artist.birthDate).getFullYear())
      )
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
      label: dict.artist.statAlbums,
    },
    {
      value: processedData.statistics.totalInfluences,
      label: dict.artist.statInfluences,
    },
    {
      value: processedData.statistics.totalCollaborations,
      label: dict.artist.statCollaborations,
    },
  ]

  return (
    <div className='space-y-8'>
      <p className='max-w-prose text-[15px] leading-relaxed text-muted'>
        {dict.artist.overviewDescription
          .replace("{name}", artist.name)
          .replace("{country}", countryPart)
          .replace("{activeSince}", activePart)
          .replace("{genres}", genresPart)}
      </p>

      <ul className='grid grid-cols-3 divide-x divide-border border-y border-border'>
        {stats.map((stat) => (
          <li key={stat.label} className='px-2 py-6 text-center'>
            <p className='text-2xl font-bold sm:text-3xl'>{stat.value}</p>
            <p className='mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted sm:text-[11px]'>
              {stat.label}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
