import { Music, Disc, BarChart3 } from "lucide-react"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface AppStatsProps {
  dict: Dictionary
}

export function AppStats({ dict }: AppStatsProps) {
  const items = [
    {
      icon: Music,
      title: dict.stats.exploreArtists,
      description: dict.stats.exploreDescription,
    },
    {
      icon: Disc,
      title: dict.stats.discography,
      description: dict.stats.discographyDescription,
    },
    {
      icon: BarChart3,
      title: dict.stats.semanticData,
      description: dict.stats.semanticDescription,
    },
  ]

  return (
    <aside style={{ animationDelay: "80ms" }} className='animate-rise'>
      <ul className='divide-y divide-border rounded-md border border-border bg-surface'>
        {items.map(({ icon: Icon, title, description }) => (
          <li key={title} className='flex items-start gap-3 px-5 py-4'>
            <Icon
              className='mt-0.5 h-4 w-4 shrink-0 text-accent'
              strokeWidth={1.5}
              aria-hidden='true'
            />
            <div>
              <h3 className='text-[13px] font-bold'>{title}</h3>
              <p className='mt-1 text-[13px] leading-relaxed text-muted'>
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
