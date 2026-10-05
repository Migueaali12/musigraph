import { Disc } from "lucide-react"
import { EmptyState } from "@/components/common/EmptyState"
import type { AlbumInfo } from "@/services/sparqlService"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface DiscographyTabProps {
  discography: AlbumInfo[]
  dict: Dictionary
}

export function DiscographyTab({ discography, dict }: DiscographyTabProps) {
  if (discography.length === 0) {
    return (
      <EmptyState
        icon={Disc}
        title={dict.artist.noDiscography}
        description={dict.artist.noDiscographyDesc}
      />
    )
  }

  return (
    <div>
      <h3 className='mb-6 flex items-center gap-2 text-2xl font-bold text-foreground'>
        <Disc className='h-6 w-6 text-coral-deep dark:text-coral-vibrant' />
        {dict.artist.discography}
      </h3>
      <ol className='space-y-3'>
        {discography.map((album, index) => {
          const year = album.releaseDate
            ? new Date(album.releaseDate).getFullYear()
            : null
          return (
            <li key={album.id || index} className='flex items-center gap-4'>
              <div className='flex h-12 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated'>
                {year ? (
                  <span className='font-mono text-sm font-medium text-coral-deep dark:text-coral-vibrant'>
                    {year}
                  </span>
                ) : (
                  <Disc className='h-4 w-4 text-muted-foreground' />
                )}
              </div>
              <div className='flex-1 rounded-lg border border-border bg-surface-elevated p-4'>
                <h4 className='font-semibold text-foreground'>{album.title}</h4>
                {album.label && (
                  <p className='mt-1 text-sm text-muted-foreground'>{album.label}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
