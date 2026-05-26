import { BarChart3 } from "lucide-react"
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

  return (
    <div className='space-y-8'>
      <div>
        <h3 className='text-2xl font-bold text-foreground mb-4 flex items-center gap-2'>
          <BarChart3 className='w-6 h-6 text-coral-vibrant' />
          {dict.artist.overviewTitle}
        </h3>
        <p className='text-muted text-lg leading-relaxed'>
          {dict.artist.overviewDescription
            .replace("{name}", artist.name)
            .replace("{country}", countryPart)
            .replace("{activeSince}", activePart)
            .replace("{genres}", genresPart)}
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='bg-gradient-energy rounded-2xl p-6 text-center'>
          <div className='text-3xl font-bold text-white mb-2'>
            {processedData.statistics.totalAlbums}
          </div>
          <div className='text-white/80'>{dict.artist.statAlbums}</div>
        </div>
        <div className='bg-gradient-ocean rounded-2xl p-6 text-center'>
          <div className='text-3xl font-bold text-white mb-2'>
            {processedData.statistics.totalInfluences}
          </div>
          <div className='text-white/80'>{dict.artist.statInfluences}</div>
        </div>
        <div className='bg-gradient-sunrise rounded-2xl p-6 text-center'>
          <div className='text-3xl font-bold text-white mb-2'>
            {processedData.statistics.totalCollaborations}
          </div>
          <div className='text-white/80'>{dict.artist.statCollaborations}</div>
        </div>
      </div>
    </div>
  )
}
