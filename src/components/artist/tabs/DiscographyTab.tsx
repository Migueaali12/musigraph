import { Disc } from "lucide-react"
import type { AlbumInfo } from "@/services/sparqlService"
import type { Dictionary } from "@/dictionaries/getDictionary"
import { TabEmpty } from "./TabEmpty"

interface DiscographyTabProps {
  discography: AlbumInfo[]
  dict: Dictionary
}

export function DiscographyTab({ discography, dict }: DiscographyTabProps) {
  if (discography.length === 0) {
    return (
      <TabEmpty
        icon={Disc}
        title={dict.artist.noDiscography}
        description={dict.artist.noDiscographyDesc}
      />
    )
  }

  return (
    <ul className='divide-y divide-border border-y border-border'>
      {discography.map((album, index) => (
        <li
          key={album.id || index}
          className='grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-3.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]'
        >
          <span className='text-[13px] text-muted'>
            {album.releaseDate
              ? new Date(album.releaseDate).getFullYear()
              : "/"}
          </span>
          <h4 className='truncate text-sm font-bold'>{album.title}</h4>
          {album.label && (
            <span className='col-start-2 text-[13px] text-muted sm:col-start-auto sm:text-right'>
              {album.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
