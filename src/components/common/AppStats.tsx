"use client"

interface StatsCardProps {
  icon: string
  title: string
  description: string
  color: string
}

function StatsCard({ icon, title, description, color }: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white`}>
      <div className='text-3xl mb-3'>{icon}</div>
      <h3 className='text-lg font-semibold mb-2'>{title}</h3>
      <p className='text-white/80 text-sm'>{description}</p>
    </div>
  )
}

export function AppStats() {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12'>
      <StatsCard
        icon='🎵'
        title='Explorar Artistas'
        description='Busca información detallada de cualquier artista o banda musical'
        color='from-coral-vibrant to-pink-symphonic'
      />
      <StatsCard
        icon='📀'
        title='Discografía'
        description='Descubre las influencias musicales y conexiones entre artistas'
        color='from-turquoise-musical to-blue-harmonic'
      />
      <StatsCard
        icon='📊'
        title='Datos Semánticos'
        description='Información estructurada desde Wikidata en tiempo real'
        color='from-gold-rhythmic to-coral-vibrant'
      />
    </div>
  )
}
