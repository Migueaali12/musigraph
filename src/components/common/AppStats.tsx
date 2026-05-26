"use client"

import { Music, Disc, BarChart3 } from "lucide-react"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface StatsCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}

function StatsCard({ icon, title, description, color }: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-md`}>
      <div className='mb-3'>{icon}</div>
      <h3 className='text-lg font-semibold mb-2'>{title}</h3>
      <p className='text-white/80 text-sm'>{description}</p>
    </div>
  )
}

interface AppStatsProps {
  dict: Dictionary
}

export function AppStats({ dict }: AppStatsProps) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12'>
      <StatsCard
        icon={<Music className="w-8 h-8" />}
        title={dict.stats.exploreArtists}
        description={dict.stats.exploreDescription}
        color='from-coral-vibrant to-pink-symphonic'
      />
      <StatsCard
        icon={<Disc className="w-8 h-8" />}
        title={dict.stats.discography}
        description={dict.stats.discographyDescription}
        color='from-turquoise-musical to-blue-harmonic'
      />
      <StatsCard
        icon={<BarChart3 className="w-8 h-8" />}
        title={dict.stats.semanticData}
        description={dict.stats.semanticDescription}
        color='from-gold-rhythmic to-coral-vibrant'
      />
    </div>
  )
}
