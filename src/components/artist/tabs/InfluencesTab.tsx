import { memo } from "react"
import { Lightbulb } from "lucide-react"
import type { ArtistInfo } from "@/services/sparqlService"
import { SourceBadge } from "@/components/common/SourceBadge"
import type { Dictionary } from "@/dictionaries/getDictionary"
import { TabEmpty } from "./TabEmpty"

interface InfluencesTabProps {
  influences: ArtistInfo[]
  dict: Dictionary
}

const InfluenceCard = memo(function InfluenceCard({ influence }: { influence: ArtistInfo }) {
  return (
    <li className='rounded-md border border-border p-4 transition-colors hover:border-accent/40'>
      <div className='flex items-start justify-between gap-2'>
        <h4 className='text-sm font-bold'>{influence.name}</h4>
        {influence.source && <SourceBadge source={influence.source} />}
      </div>
      {influence.country && (
        <p className='mt-1 text-[13px] text-muted'>{influence.country}</p>
      )}
      {influence.genres.length > 0 && (
        <div className='mt-2.5 flex flex-wrap gap-1.5'>
          {influence.genres.slice(0, 3).map((genre, genreIndex) => (
            <span
              key={genreIndex}
              className='chip border-turquoise/20 bg-turquoise-soft text-turquoise'
            >
              {genre}
            </span>
          ))}
        </div>
      )}
    </li>
  )
})

export function InfluencesTab({ influences, dict }: InfluencesTabProps) {
  if (influences.length === 0) {
    return (
      <TabEmpty
        icon={Lightbulb}
        title={dict.artist.noInfluences}
        description={dict.artist.noInfluencesDesc}
      />
    )
  }

  return (
    <ul className='list-long-cards grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
      {influences.map((influence, index) => (
        <InfluenceCard key={influence.id || index} influence={influence} />
      ))}
    </ul>
  )
}
