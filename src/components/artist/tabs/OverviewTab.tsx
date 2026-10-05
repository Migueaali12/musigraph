import { BarChart3 } from "lucide-react"
import type { ArtistInfo } from "@/services/sparqlService"
import type { ProcessedArtistData } from "@/services/dataProcessor"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface OverviewTabProps {
  artist: ArtistInfo
  processedData: ProcessedArtistData
  dict: Dictionary
}

interface StatTileProps {
  value: number
  label: string
}

function StatTile({ value, label }: StatTileProps) {
  return (
    <div className='rounded-2xl border border-border bg-surface-elevated p-6 text-center'>
      <div className='font-mono text-3xl font-bold text-coral-deep dark:text-coral-vibrant'>
        {value}
      </div>
      <div className='mt-1 text-sm text-muted-foreground'>{label}</div>
    </div>
  )
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

  return (
    <div className='space-y-8'>
      <div>
        <h3 className='mb-4 flex items-center gap-2 text-2xl font-bold text-foreground'>
          <BarChart3 className='h-6 w-6 text-coral-deep dark:text-coral-vibrant' />
          {dict.artist.overviewTitle}
        </h3>
        <p className='text-lg leading-relaxed text-muted-foreground'>
          {dict.artist.overviewDescription
            .replace("{name}", artist.name)
            .replace("{country}", countryPart)
            .replace("{activeSince}", activePart)
            .replace("{genres}", genresPart)}
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatTile
          value={processedData.statistics.totalAlbums}
          label={dict.artist.statAlbums}
        />
        <StatTile
          value={processedData.statistics.totalInfluences}
          label={dict.artist.statInfluences}
        />
        <StatTile
          value={processedData.statistics.totalCollaborations}
          label={dict.artist.statCollaborations}
        />
      </div>
    </div>
  )
}
