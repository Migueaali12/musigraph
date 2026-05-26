import { Handshake, Users, Calendar } from "lucide-react"
import type { CollaborationInfo } from "@/services/sparqlService"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface CollaborationsTabProps {
  collaborations: CollaborationInfo[]
  dict: Dictionary
}

export function CollaborationsTab({ collaborations, dict }: CollaborationsTabProps) {
  if (collaborations.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 mx-auto mb-4 bg-surface-elevated rounded-full flex items-center justify-center'>
          <Users className='w-8 h-8 text-muted' />
        </div>
        <h4 className='text-lg font-semibold text-foreground mb-2'>
          {dict.artist.noCollaborations}
        </h4>
        <p className='text-muted'>{dict.artist.noCollaborationsDesc}</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className='text-2xl font-bold text-foreground mb-6 flex items-center gap-2'>
        <Handshake className='w-6 h-6 text-coral-vibrant' />
        {dict.artist.collaborationsTab}
      </h3>
      <div className='space-y-4'>
        {collaborations.map((collab, index) => (
          <div
            key={index}
            className='p-4 bg-surface-elevated border border-border rounded-xl hover:border-border/60 transition-colors'
          >
            <h4 className='font-semibold text-foreground mb-2'>{collab.song}</h4>
            <div className='flex items-center gap-4 text-sm text-muted'>
              <span className='inline-flex items-center gap-1'>
                <Users className='w-4 h-4' />
                {dict.artist.with.replace("{artist}", collab.artist2)}
              </span>
              {collab.releaseDate && (
                <span className='inline-flex items-center gap-1'>
                  <Calendar className='w-4 h-4' />
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
