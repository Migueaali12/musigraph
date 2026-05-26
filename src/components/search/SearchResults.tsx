"use client"

import { useState } from "react"
import { type ArtistInfo } from "@/services/sparqlService"
import { WelcomeMessage } from "@/components/common/WelcomeMessage"
import Image from "next/image"
import { Lightbulb, MapPin, Calendar, Music } from "lucide-react"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface SearchResultsProps {
  results: ArtistInfo[]
  isLoading: boolean
  searchTerm: string
  onArtistSelect: (artist: ArtistInfo) => void
  dict: Dictionary
}

export function SearchResults({
  results,
  isLoading,
  searchTerm,
  onArtistSelect,
  dict,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className='text-center py-12'>
        <div className='inline-flex items-center gap-3'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-coral-vibrant'></div>
          <span className='text-foreground text-lg'>
            {dict.results.searchingUniverse}
          </span>
        </div>
      </div>
    )
  }

  if (!searchTerm) {
    return (
      <div className='text-center py-12'>
        <WelcomeMessage dict={dict} />
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
          <h3 className='text-2xl font-bold text-foreground mb-2'>
            {dict.results.discoverUniverse}
          </h3>
          <p className='text-muted max-w-md mx-auto'>
            {dict.results.discoverDescription}
          </p>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='mb-8'>
          <div className='w-24 h-24 mx-auto mb-4 bg-surface-elevated rounded-full flex items-center justify-center'>
            <svg
              className='w-12 h-12 text-muted'
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
          <h3 className='text-xl font-bold text-foreground mb-2'>
            {dict.results.noResults.replace("{searchTerm}", searchTerm)}
          </h3>
          <p className='text-muted max-w-md mx-auto mb-6'>
            {dict.results.noResultsDescription}
          </p>
          <div className='space-y-2 text-sm text-muted'>
            <p className="flex items-center justify-center gap-1">
              <Lightbulb className="w-4 h-4" /> <strong>{dict.results.suggestions}</strong>
            </p>
            <p>• {dict.results.suggestion1}</p>
            <p>• {dict.results.suggestion2}</p>
            <p>• {dict.results.suggestion3}</p>
          </div>
        </div>
      </div>
    )
  }

  const artistCountText = results.length === 1
    ? dict.results.foundArtistsOne
    : dict.results.foundArtistsMany.replace("{count}", String(results.length))

  return (
    <div>
      <div className='mb-6'>
        <h2 className='text-2xl font-bold text-foreground mb-2'>
          {dict.results.resultsFor.replace("{searchTerm}", searchTerm)}
        </h2>
        <p className='text-muted'>
          {artistCountText}
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {results.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            onClick={() => onArtistSelect(artist)}
            dict={dict}
          />
        ))}
      </div>
    </div>
  )
}

interface ArtistCardProps {
  artist: ArtistInfo
  onClick: () => void
  dict: Dictionary
}

function ArtistCard({ artist, onClick, dict }: ArtistCardProps) {
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div
      onClick={onClick}
      className='bg-surface border border-border rounded-2xl p-6 hover:border-coral-vibrant/50 hover:shadow-md transition-all duration-300 cursor-pointer group'
    >
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

      <div className='text-center'>
        <h3 className='text-lg font-semibold text-foreground mb-2 group-hover:text-coral-vibrant transition-colors'>
          {artist.name}
        </h3>

        {artist.country && (
          <p className='text-sm text-muted mb-2 flex items-center justify-center gap-1'><MapPin className="w-4 h-4" /> {artist.country}</p>
        )}

        {artist.birthDate && (
          <p className='text-sm text-muted mb-3 flex items-center justify-center gap-1'>
            <Calendar className="w-4 h-4" /> {new Date(artist.birthDate).getFullYear()}
          </p>
        )}

        {artist.genres.length > 0 && (
          <div className='mb-3'>
            <div className='flex flex-wrap justify-center gap-1'>
              {artist.genres.slice(0, 3).map((genre, index) => (
                <span
                  key={index}
                  className='px-2 py-1 bg-coral-vibrant/15 text-coral-vibrant text-xs rounded-full font-medium'
                >
                  {genre}
                </span>
              ))}
              {artist.genres.length > 3 && (
                <span className='px-2 py-1 bg-surface-elevated text-muted text-xs rounded-full'>
                  +{artist.genres.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {artist.instruments.length > 0 && (
          <div className='text-xs text-muted flex items-center justify-center gap-1'>
            <Music className="w-4 h-4" /> {artist.instruments.slice(0, 2).join(", ")}
            {artist.instruments.length > 2 && "..."}
          </div>
        )}
      </div>

      <div className='text-center mt-4 opacity-0 group-hover:opacity-100 transition-opacity'>
        <span className='text-xs text-coral-vibrant'>{dict.results.clickToExplore}</span>
      </div>
    </div>
  )
}
