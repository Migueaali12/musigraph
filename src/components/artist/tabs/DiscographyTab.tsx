import { Disc, Calendar, Tag } from "lucide-react"
import type { AlbumInfo } from "@/services/sparqlService"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface DiscographyTabProps {
  discography: AlbumInfo[]
  dict: Dictionary
}

export function DiscographyTab({ discography, dict }: DiscographyTabProps) {
  if (discography.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 mx-auto mb-4 bg-surface-elevated rounded-full flex items-center justify-center'>
          <Disc className='w-8 h-8 text-muted' />
        </div>
        <h4 className='text-lg font-semibold text-foreground mb-2 font-sans'>
          {dict.artist.noDiscography}
        </h4>
        <p className='text-muted'>{dict.artist.noDiscographyDesc}</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className='text-2xl font-bold text-foreground mb-6 flex items-center gap-2'>
        <Disc className='w-6 h-6 text-coral-vibrant' />
        {dict.artist.discography}
      </h3>
      <div className='space-y-4'>
        {discography.map((album, index) => (
          <div
            key={album.id || index}
            className='flex items-center gap-4 p-4 bg-surface-elevated border border-border rounded-xl hover:border-border/60 transition-colors'
          >
            <div className='w-12 h-12 bg-gradient-ocean rounded-lg flex items-center justify-center shrink-0'>
              <Disc className='w-6 h-6 text-white' />
            </div>
            <div className='flex-1 min-w-0'>
              <h4 className='font-semibold text-foreground'>{album.title}</h4>
              <div className='flex items-center gap-4 text-sm text-muted'>
                {album.releaseDate && (
                  <span className='inline-flex items-center gap-1'>
                    <Calendar className='w-4 h-4' />
                    {new Date(album.releaseDate).getFullYear()}
                  </span>
                )}
                {album.label && (
                  <span className='inline-flex items-center gap-1'>
                    <Tag className='w-4 h-4' />
                    {album.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
