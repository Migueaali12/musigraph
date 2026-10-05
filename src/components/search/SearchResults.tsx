"use client"

import { useState } from "react"
import { type ArtistInfo } from "@/services/sparqlService"
import { EmptyState } from "@/components/common/EmptyState"
import { Badge } from "@/components/common/Badge"
import Image from "next/image"
import { Lightbulb, MapPin, Calendar, Music, Search, ArrowRight } from "lucide-react"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface SearchResultsProps {
  results: ArtistInfo[]
  isLoading: boolean
  searchTerm: string
  onArtistSelect: (artist: ArtistInfo) => void
  dict: Dictionary
}

function ResultSkeleton() {
  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className='animate-pulse rounded-2xl border border-border bg-surface p-6'
        >
          <div className='mx-auto mb-4 h-24 w-24 rounded-full bg-surface-elevated' />
          <div className='mx-auto h-5 w-2/3 rounded bg-surface-elevated' />
          <div className='mx-auto mt-2 h-4 w-1/2 rounded bg-surface-elevated' />
          <div className='mx-auto mt-4 h-6 w-3/4 rounded bg-surface-elevated' />
        </div>
      ))}
    </div>
  )
}

export function SearchResults({
  results,
  isLoading,
  searchTerm,
  onArtistSelect,
  dict,
}: SearchResultsProps) {
  if (isLoading) {
    return <ResultSkeleton />
  }

  if (!searchTerm) {
    return (
      <EmptyState
        icon={Search}
        title={dict.results.discoverUniverse}
        description={dict.results.discoverDescription}
      />
    )
  }

  if (results.length === 0) {
    return (
      <div>
        <EmptyState
          icon={Search}
          title={dict.results.noResults.replace("{searchTerm}", searchTerm)}
          description={dict.results.noResultsDescription}
        />
        <div className='mx-auto max-w-md text-center'>
          <p className='mb-2 flex items-center justify-center gap-1.5 text-sm font-medium text-foreground'>
            <Lightbulb className='h-4 w-4 text-coral-deep dark:text-coral-vibrant' />
            {dict.results.suggestions}
          </p>
          <ul className='space-y-1 text-sm text-muted-foreground'>
            <li>{dict.results.suggestion1}</li>
            <li>{dict.results.suggestion2}</li>
            <li>{dict.results.suggestion3}</li>
          </ul>
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
        <h2 className='mb-2 text-2xl font-bold text-foreground'>
          {dict.results.resultsFor.replace("{searchTerm}", searchTerm)}
        </h2>
        <p className='text-muted-foreground'>{artistCountText}</p>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
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

  return (
    <button
      type='button'
      onClick={onClick}
      className='group flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center transition-colors hover:border-coral-deep/40 dark:hover:border-coral-vibrant/50'
    >
      <div className='relative mb-4 h-24 w-24'>
        {artist.image && !imageError ? (
          <Image
            src={artist.image}
            alt={artist.name}
            fill
            className='rounded-full object-cover'
            onError={() => setImageError(true)}
            sizes='96px'
            priority={false}
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center rounded-full bg-surface-elevated'>
            <Music className='h-9 w-9 text-muted-foreground' />
          </div>
        )}
      </div>

      <h3 className='mb-2 text-lg font-semibold text-foreground transition-colors group-hover:text-coral-deep dark:group-hover:text-coral-vibrant'>
        {artist.name}
      </h3>

      {artist.country && (
        <p className='mb-2 flex items-center justify-center gap-1 text-sm text-muted-foreground'>
          <MapPin className='h-4 w-4' /> {artist.country}
        </p>
      )}

      {artist.birthDate && (
        <p className='mb-3 flex items-center justify-center gap-1 text-sm text-muted-foreground'>
          <Calendar className='h-4 w-4' /> {new Date(artist.birthDate).getFullYear()}
        </p>
      )}

      {artist.genres.length > 0 && (
        <div className='mb-3 flex flex-wrap justify-center gap-1.5'>
          {artist.genres.slice(0, 3).map((genre, index) => (
            <Badge key={index}>{genre}</Badge>
          ))}
          {artist.genres.length > 3 && (
            <Badge variant='muted'>+{artist.genres.length - 3}</Badge>
          )}
        </div>
      )}

      {artist.instruments.length > 0 && (
        <div className='flex items-center justify-center gap-1 text-xs text-muted-foreground'>
          <Music className='h-4 w-4' /> {artist.instruments.slice(0, 2).join(", ")}
          {artist.instruments.length > 2 && "..."}
        </div>
      )}

      <span className='mt-4 inline-flex items-center gap-1 text-xs text-coral-deep opacity-0 transition-opacity group-hover:opacity-100 dark:text-coral-vibrant'>
        {dict.results.clickToExplore}
        <ArrowRight className='h-3.5 w-3.5' />
      </span>
    </button>
  )
}
