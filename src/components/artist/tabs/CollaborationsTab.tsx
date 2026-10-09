import { Handshake } from "lucide-react"
import type { CollaborationInfo } from "@/services/sparqlService"
import type { Dictionary } from "@/dictionaries/getDictionary"
import { TabEmpty } from "./TabEmpty"

interface CollaborationsTabProps {
  collaborations: CollaborationInfo[]
  dict: Dictionary
}

export function CollaborationsTab({ collaborations, dict }: CollaborationsTabProps) {
  if (collaborations.length === 0) {
    return (
      <TabEmpty
        icon={Handshake}
        title={dict.artist.noCollaborations}
        description={dict.artist.noCollaborationsDesc}
      />
    )
  }

  return (
    <ul className='divide-y divide-border border-y border-border'>
      {collaborations.map((collab, index) => (
        <li
          key={index}
          className='flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-3.5'
        >
          <h4 className='text-sm font-bold'>{collab.song}</h4>
          <p className='text-[13px] text-muted'>
            {dict.artist.with.replace("{artist}", collab.artist2)}
            {collab.releaseDate && (
              <span className='ml-3'>
                {new Date(collab.releaseDate).getFullYear()}
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}
