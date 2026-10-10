import { memo } from "react"
import { Disc } from "lucide-react"
import type { AlbumInfo } from "@/services/sparqlService"
import { SourceBadge } from "@/components/common/SourceBadge"
import { extractYear } from "@/utils/date"
import type { Dictionary } from "@/dictionaries/getDictionary"
import { TabEmpty } from "./TabEmpty"

interface DiscographyTabProps {
  discography: AlbumInfo[]
  dict: Dictionary
}

interface DiscographyRowProps {
  album: AlbumInfo
}

const DiscographyRow = memo(function DiscographyRow({ album }: DiscographyRowProps) {
  const year = extractYear(album.releaseDate)
  return (
    <li className='grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-3.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]'>
      <span className='text-[13px] text-muted'>{year ?? "/"}</span>
      <span className='flex min-w-0 items-baseline gap-2'>
        <h4 className='truncate text-sm font-bold'>{album.title}</h4>
        {album.type && (
          <span className='chip shrink-0 border-turquoise/20 bg-turquoise-soft text-turquoise'>
            {album.type}
          </span>
        )}
        {album.source && <SourceBadge source={album.source} />}
      </span>
      {album.label && (
        <span className='col-start-2 text-[13px] text-muted sm:col-start-auto sm:text-right'>
          {album.label}
        </span>
      )}
    </li>
  )
})

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
    <ul className='list-long divide-y divide-border border-y border-border'>
      {discography.map((album, index) => (
        <DiscographyRow
          key={album.id || `${album.title}-${index}`}
          album={album}
        />
      ))}
    </ul>
  )
}
