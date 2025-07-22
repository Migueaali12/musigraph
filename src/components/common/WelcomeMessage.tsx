"use client"

import { useState, useEffect } from "react"

export function WelcomeMessage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const examples = [
    "The Beatles",
    "Pink Floyd",
    "Queen",
    "Bob Dylan",
    "Miles Davis",
    "Radiohead",
  ]

  if (!isVisible) return null

  return (
    <div className='text-center mb-8 animate-in fade-in duration-1000'>
      <div className='bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10'>
        <h3 className='text-2xl font-bold text-white mb-4'>
          ¡Bienvenido al Universo Musical Conectado! 🎵
        </h3>
        <p className='text-gray-300 mb-6 max-w-2xl mx-auto'>
          Descubre las conexiones ocultas entre tus artistas favoritos. Explora
          influencias, colaboraciones y la rica historia musical a través de
          datos semánticos en tiempo real.
        </p>

        <div className='mb-4'>
          <p className='text-sm text-gray-400 mb-3'>
            💡 Prueba buscar alguno de estos artistas:
          </p>
          <div className='flex flex-wrap justify-center gap-2'>
            {examples.map((artist, index) => (
              <span
                key={index}
                className='px-3 py-1 bg-coral-vibrant/20 text-coral-vibrant rounded-full text-sm'
              >
                {artist}
              </span>
            ))}
          </div>
        </div>

        <div className='text-xs text-gray-500 space-y-1'>
          <p>🌐 Datos en tiempo real desde Wikidata</p>
          <p>🔍 Búsquedas inteligentes con filtros avanzados</p>
          <p>📊 Visualizaciones interactivas de conexiones musicales</p>
        </div>
      </div>
    </div>
  )
}
