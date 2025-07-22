"use client"

import { useState } from "react"
import { type ArtistInfo } from "@/services/sparqlService"
import { WelcomeMessage } from "@/components/common/WelcomeMessage"
import Image from "next/image"

interface SearchResultsProps {
  results: ArtistInfo[]
  isLoading: boolean
  searchTerm: string
  onArtistSelect: (artist: ArtistInfo) => void
}

export function SearchResults({
  results,
  isLoading,
  searchTerm,
  onArtistSelect,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className='text-center py-12'>
        <div className='inline-flex items-center gap-3'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-coral-vibrant'></div>
          <span className='text-white text-lg'>
            Buscando en el universo musical...
          </span>
        </div>
      </div>
    )
  }

  if (!searchTerm) {
    return (
      <div className='text-center py-12'>
        <WelcomeMessage />
        <div className='mb-8'>
          <div className='w-24 h-24 mx-auto mb-4 bg-gradient-energy rounded-full flex items-center justify-center'>
            <svg
              className='w-12 h-12 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
              />
            </svg>
          </div>
          <h3 className='text-2xl font-bold text-white mb-2'>
            Descubre el Universo Musical
          </h3>
          <p className='text-gray-400 max-w-md mx-auto'>
            Busca cualquier artista, banda o compositor para explorar sus
            conexiones musicales, influencias y colaboraciones.
          </p>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='mb-8'>
          <div className='w-24 h-24 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center'>
            <svg
              className='w-12 h-12 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
          </div>
          <h3 className='text-xl font-bold text-white mb-2'>
            No encontramos resultados para &ldquo;{searchTerm}&rdquo;
          </h3>
          <p className='text-gray-400 max-w-md mx-auto mb-6'>
            Intenta con un nombre diferente o revisa la ortografía. También
            puedes usar términos en inglés.
          </p>
          <div className='space-y-2 text-sm text-gray-500'>
            <p>
              💡 <strong>Sugerencias:</strong>
            </p>
            <p>
              • Intenta con &ldquo;The Beatles&rdquo; en lugar de
              &ldquo;Beatles&rdquo;
            </p>
            <p>• Usa nombres completos: &ldquo;Michael Jackson&rdquo;</p>
            <p>• Prueba términos en inglés para mejores resultados</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className='mb-6'>
        <h2 className='text-2xl font-bold text-white mb-2'>
          Resultados para &ldquo;{searchTerm}&rdquo;
        </h2>
        <p className='text-gray-400'>
          Encontrados {results.length} artista{results.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {results.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            onClick={() => onArtistSelect(artist)}
          />
        ))}
      </div>
    </div>
  )
}

interface ArtistCardProps {
  artist: ArtistInfo
  onClick: () => void
}

function ArtistCard({ artist, onClick }: ArtistCardProps) {
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div
      onClick={onClick}
      className='bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-coral-vibrant/50 hover:bg-white/10 transition-all duration-300 cursor-pointer group'
    >
      {/* Imagen del artista */}
      <div className='relative w-24 h-24 mx-auto mb-4'>
        {artist.image && !imageError ? (
          <Image
            src={artist.image}
            alt={artist.name}
            fill
            className='rounded-full object-cover'
            onError={handleImageError}
            sizes='96px'
            priority={false}
          />
        ) : (
          <div className='w-full h-full bg-gradient-ocean rounded-full flex items-center justify-center'>
            <svg
              className='w-8 h-8 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
              />
            </svg>
          </div>
        )}
      </div>

      {/* Información del artista */}
      <div className='text-center'>
        <h3 className='text-lg font-semibold text-white mb-2 group-hover:text-coral-vibrant transition-colors'>
          {artist.name}
        </h3>

        {/* País */}
        {artist.country && (
          <p className='text-sm text-gray-400 mb-2'>📍 {artist.country}</p>
        )}

        {/* Fecha */}
        {artist.birthDate && (
          <p className='text-sm text-gray-400 mb-3'>
            📅 {new Date(artist.birthDate).getFullYear()}
          </p>
        )}

        {/* Géneros */}
        {artist.genres.length > 0 && (
          <div className='mb-3'>
            <div className='flex flex-wrap justify-center gap-1'>
              {artist.genres.slice(0, 3).map((genre, index) => (
                <span
                  key={index}
                  className='px-2 py-1 bg-coral-vibrant/20 text-coral-vibrant text-xs rounded-full'
                >
                  {genre}
                </span>
              ))}
              {artist.genres.length > 3 && (
                <span className='px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full'>
                  +{artist.genres.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Instrumentos */}
        {artist.instruments.length > 0 && (
          <div className='text-xs text-gray-500'>
            🎵 {artist.instruments.slice(0, 2).join(", ")}
            {artist.instruments.length > 2 && "..."}
          </div>
        )}
      </div>

      {/* Indicador de clic */}
      <div className='text-center mt-4 opacity-0 group-hover:opacity-100 transition-opacity'>
        <span className='text-xs text-coral-vibrant'>Clic para explorar →</span>
      </div>
    </div>
  )
}
