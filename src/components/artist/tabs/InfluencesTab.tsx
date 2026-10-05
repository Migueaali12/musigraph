import { Lightbulb, MapPin } from "lucide-react"
import { EmptyState } from "@/components/common/EmptyState"
import { Badge } from "@/components/common/Badge"
import type { ArtistInfo } from "@/services/sparqlService"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface InfluencesTabProps {
  influences: ArtistInfo[]
  dict: Dictionary
}

export function InfluencesTab({ influences, dict }: InfluencesTabProps) {
  if (influences.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title={dict.artist.noInfluences}
        description={dict.artist.noInfluencesDesc}
      />
    )
  }

  return (
    <div>
      <h3 className='mb-6 flex items-center gap-2 text-2xl font-bold text-foreground'>
        <Lightbulb className='h-6 w-6 text-coral-deep dark:text-coral-vibrant' />
        {dict.artist.influencesTab}
      </h3>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {influences.map((influence, index) => (
          <div
            key={influence.id || index}
            className='rounded-2xl border border-border bg-surface-elevated p-4 transition-colors hover:border-coral-deep/30 dark:hover:border-coral-vibrant/40'
          >
            <h4 className='mb-2 font-semibold text-foreground'>{influence.name}</h4>
            {influence.country && (
              <p className='mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground'>
                <MapPin className='h-4 w-4' />
                {influence.country}
              </p>
            )}
            {influence.genres.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {influence.genres.slice(0, 3).map((genre, genreIndex) => (
                  <Badge key={genreIndex}>{genre}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
