import { Music, Disc, BarChart3, type LucideIcon } from "lucide-react"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface FeatureItemProps {
  icon: LucideIcon
  title: string
  description: string
}

function FeatureItem({ icon: Icon, title, description }: FeatureItemProps) {
  return (
    <li className='flex items-start gap-4 p-5'>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-elevated'>
        <Icon className='h-5 w-5 text-coral-deep dark:text-coral-vibrant' />
      </div>
      <div>
        <h3 className='text-sm font-semibold text-foreground'>{title}</h3>
        <p className='mt-1 text-sm leading-relaxed text-muted-foreground'>
          {description}
        </p>
      </div>
    </li>
  )
}

interface AppStatsProps {
  dict: Dictionary
}

export function AppStats({ dict }: AppStatsProps) {
  return (
    <ul className='divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface'>
      <FeatureItem
        icon={Music}
        title={dict.stats.exploreArtists}
        description={dict.stats.exploreDescription}
      />
      <FeatureItem
        icon={Disc}
        title={dict.stats.discography}
        description={dict.stats.discographyDescription}
      />
      <FeatureItem
        icon={BarChart3}
        title={dict.stats.semanticData}
        description={dict.stats.semanticDescription}
      />
    </ul>
  )
}
