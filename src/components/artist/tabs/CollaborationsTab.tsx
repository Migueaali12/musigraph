import { Handshake, Users, Calendar } from "lucide-react"
import { EmptyState } from "@/components/common/EmptyState"
import type { CollaborationInfo } from "@/services/sparqlService"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface CollaborationsTabProps {
  collaborations: CollaborationInfo[]
  dict: Dictionary
}

export function CollaborationsTab({ collaborations, dict }: CollaborationsTabProps) {
  if (collaborations.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={dict.artist.noCollaborations}
        description={dict.artist.noCollaborationsDesc}
      />
    )
  }

  return (
    <div>
      <h3 className='mb-6 flex items-center gap-2 text-2xl font-bold text-foreground'>
        <Handshake className='h-6 w-6 text-coral-deep dark:text-coral-vibrant' />
        {dict.artist.collaborationsTab}
      </h3>
      <div className='space-y-3'>
        {collaborations.map((collab, index) => (
          <div
            key={index}
            className='rounded-xl border border-border bg-surface-elevated p-4 transition-colors hover:border-coral-deep/30 dark:hover:border-coral-vibrant/40'
          >
            <h4 className='mb-2 font-semibold text-foreground'>{collab.song}</h4>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground'>
              <span className='inline-flex items-center gap-1'>
                <Users className='h-4 w-4' />
                {dict.artist.with.replace("{artist}", collab.artist2)}
              </span>
              {collab.releaseDate && (
                <span className='inline-flex items-center gap-1'>
                  <Calendar className='h-4 w-4' />
                  {new Date(collab.releaseDate).getFullYear()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
