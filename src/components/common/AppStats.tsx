"use client"

import { Music, Disc, BarChart3 } from "lucide-react"

interface StatsCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}

function StatsCard({ icon, title, description, color }: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white`}>
      <div className='mb-3'>{icon}</div>
      <h3 className='text-lg font-semibold mb-2'>{title}</h3>
      <p className='text-white/80 text-sm'>{description}</p>
    </div>
  )
}

export function AppStats() {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12'>
      <StatsCard
        icon={<Music className="w-8 h-8" />}
        title='Explorar Artistas'
        description='Busca información detallada de cualquier artista o banda musical'
        color='from-coral-vibrant to-pink-symphonic'
      />
      <StatsCard
        icon={<Disc className="w-8 h-8" />}
        title='Discografía'
        description='Descubre las influencias musicales y conexiones entre artistas'
        color='from-turquoise-musical to-blue-harmonic'
      />
      <StatsCard
        icon={<BarChart3 className="w-8 h-8" />}
        title='Datos Semánticos'
        description='Información estructurada desde Wikidata en tiempo real'
        color='from-gold-rhythmic to-coral-vibrant'
      />
    </div>
  )
}
