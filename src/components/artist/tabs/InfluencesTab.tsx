import { Lightbulb, MapPin } from "lucide-react"
import type { ArtistInfo } from "@/services/sparqlService"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface InfluencesTabProps {
  influences: ArtistInfo[]
  dict: Dictionary
}

export function InfluencesTab({ influences, dict }: InfluencesTabProps) {
  if (influences.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 mx-auto mb-4 bg-surface-elevated rounded-full flex items-center justify-center'>
          <Lightbulb className='w-8 h-8 text-muted' />
        </div>
        <h4 className='text-lg font-semibold text-foreground mb-2'>
          {dict.artist.noInfluences}
        </h4>
        <p className='text-muted'>{dict.artist.noInfluencesDesc}</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className='text-2xl font-bold text-foreground mb-6 flex items-center gap-2'>
        <Lightbulb className='w-6 h-6 text-coral-vibrant' />
        {dict.artist.influencesTab}
      </h3>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {influences.map((influence, index) => (
          <div
            key={influence.id || index}
            className='p-4 bg-surface-elevated border border-border rounded-xl hover:border-border/60 transition-colors'
          >
            <h4 className='font-semibold text-foreground mb-2'>{influence.name}</h4>
            {influence.country && (
              <p className='text-sm text-muted mb-2 inline-flex items-center gap-1'>
                <MapPin className='w-4 h-4' />
                {influence.country}
              </p>
            )}
            {influence.genres.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {influence.genres.slice(0, 3).map((genre, genreIndex) => (
                  <span
                    key={genreIndex}
                    className='px-2 py-1 bg-turquoise-musical/15 text-turquoise-musical text-xs rounded-full font-medium'
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
