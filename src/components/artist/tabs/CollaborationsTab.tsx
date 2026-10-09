import { useMemo } from "react"
import { Handshake } from "lucide-react"
import { dataProcessor } from "@/services/dataProcessor"
import type { CollaborationInfo } from "@/services/sparqlService"
import { extractYear } from "@/utils/date"
import type { Dictionary } from "@/dictionaries/getDictionary"
import { TabEmpty } from "./TabEmpty"

interface CollaborationsTabProps {
  collaborations: CollaborationInfo[]
  dict: Dictionary
}

const MAX_VISIBLE_WORKS = 4

export function CollaborationsTab({ collaborations, dict }: CollaborationsTabProps) {
  const groups = useMemo(
    () => dataProcessor.groupCollaborations(collaborations),
    [collaborations]
  )

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
      {groups.map((group) => (
        <li key={group.collaboratorId} className='py-3.5'>
          <div className='flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5'>
            <h4 className='text-sm font-bold'>{group.collaborator}</h4>
            <p className='text-[13px] text-muted'>
              {dict.artist.worksCount.replace("{count}", String(group.count))}
            </p>
          </div>

          <ul className='mt-1.5 space-y-1'>
            {group.works.slice(0, MAX_VISIBLE_WORKS).map((work, index) => {
              const year = extractYear(work.releaseDate)
              return (
                <li
                  key={`${work.work}-${index}`}
                  className='flex items-baseline gap-2 text-[13px] text-muted'
                >
                  <span className='min-w-0 truncate'>{work.work}</span>
                  {work.workType === "album" && (
                    <span className='chip shrink-0 border-turquoise/20 bg-turquoise-soft text-turquoise'>
                      {dict.artist.albumWork}
                    </span>
                  )}
                  {year !== null && (
                    <span className='ml-auto shrink-0'>{year}</span>
                  )}
                </li>
              )
            })}
            {group.works.length > MAX_VISIBLE_WORKS && (
              <li className='text-[13px] text-muted'>
                {dict.artist.moreWorks.replace(
                  "{count}",
                  String(group.works.length - MAX_VISIBLE_WORKS)
                )}
              </li>
            )}
          </ul>
        </li>
      ))}
    </ul>
  )
}
