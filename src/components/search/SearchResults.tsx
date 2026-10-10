"use client"

import { useState } from "react"
import { type ArtistInfo } from "@/services/sparqlService"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { getInitials } from "@/utils/format"
import { extractYear } from "@/utils/date"
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
      <div className='animate-rise'>
        <p className='mb-4 flex items-center gap-2 text-[13px] text-muted'>
          {dict.results.searchingUniverse}
          <span aria-hidden='true' className='blink cursor-block text-accent' />
        </p>
        <ul className='divide-y divide-border border-y border-border'>
          {[0, 1, 2].map((i) => (
            <li key={i} className='flex items-center gap-4 py-4'>
              <div className='h-10 w-10 shrink-0 animate-pulse rounded-sm bg-surface-elevated' />
              <div className='flex-1 space-y-2'>
                <div className='h-3.5 w-40 animate-pulse rounded-xs bg-surface-elevated' />
                <div className='h-3 w-64 max-w-full animate-pulse rounded-xs bg-surface-elevated' />
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (!searchTerm) {
    return null
  }

  if (results.length === 0) {
    return (
      <div className='animate-rise border-y border-border py-14 text-center'>
        <h3 className='mb-2 text-lg font-bold'>
          {dict.results.noResults.replace("{searchTerm}", searchTerm)}
        </h3>
        <p className='mx-auto mb-8 max-w-md text-[13px] leading-relaxed text-muted'>
          {dict.results.noResultsDescription}
        </p>
        <div className='mx-auto max-w-sm rounded-sm border border-border bg-surface p-4 text-left'>
          <p className='mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted'>
            {dict.results.suggestions}
          </p>
          <ul className='space-y-1.5 text-[13px] text-muted'>
            <li className='flex gap-2'>
              <span aria-hidden='true' className='text-accent'>&gt;</span>
              {dict.results.suggestion1}
            </li>
            <li className='flex gap-2'>
              <span aria-hidden='true' className='text-accent'>&gt;</span>
              {dict.results.suggestion2}
            </li>
            <li className='flex gap-2'>
              <span aria-hidden='true' className='text-accent'>&gt;</span>
              {dict.results.suggestion3}
            </li>
          </ul>
        </div>
      </div>
    )
  }

  const artistCountText = results.length === 1
    ? dict.results.foundArtistsOne
    : dict.results.foundArtistsMany.replace("{count}", String(results.length))

  return (
    <div className='animate-rise'>
      <div className='mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
        <h2 className='text-xl font-bold tracking-tight'>
          {dict.results.resultsFor.replace("{searchTerm}", searchTerm)}
        </h2>
        <p className='text-[13px] text-muted'>{artistCountText}</p>
      </div>

      <ul className='divide-y divide-border border-y border-border'>
        {results.map((artist) => (
          <ArtistRow
            key={artist.id}
            artist={artist}
            onClick={() => onArtistSelect(artist)}
          />
        ))}
      </ul>
    </div>
  )
}

interface ArtistRowProps {
  artist: ArtistInfo
  onClick: () => void
}

function ArtistRow({ artist, onClick }: ArtistRowProps) {
  const [imageError, setImageError] = useState(false)

  const hasImage = Boolean(artist.image) && !imageError
  const year = extractYear(artist.birthDate)

  const metaParts: string[] = []
  if (artist.country) metaParts.push(artist.country)
  if (year) metaParts.push(String(year))
  if (artist.instruments.length > 0) {
    metaParts.push(artist.instruments.slice(0, 2).join(", "))
  }

  return (
    <li>
      <button
        type='button'
        onClick={onClick}
        className='group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4 text-left'
      >
        <span className='relative block h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-border'>
          {hasImage ? (
            <Image
              src={artist.image as string}
              alt={artist.name}
              fill
              className='object-cover'
              onError={() => setImageError(true)}
              sizes='40px'
            />
          ) : (
            <span
              aria-hidden='true'
              className='flex h-full w-full items-center justify-center bg-surface-elevated text-[13px] font-bold text-muted'
            >
              {getInitials(artist.name)}
            </span>
          )}
        </span>

        <span className='min-w-0'>
          <span className='block truncate text-[15px] font-bold transition-colors group-hover:text-accent'>
            {artist.name}
          </span>
          {artist.description && (
            <span className='mt-1 block truncate text-[13px] text-muted'>
              {artist.description}
            </span>
          )}
          {metaParts.length > 0 && (
            <span
              className={`block truncate text-[13px] text-muted ${
                artist.description ? "mt-0.5" : "mt-1"
              }`}
            >
              {metaParts.join("  /  ")}
            </span>
          )}
        </span>

        <span className='flex items-center gap-3'>
          {artist.genres.length > 0 && (
            <span className='hidden max-w-[220px] flex-wrap justify-end gap-1.5 sm:flex'>
              {artist.genres.slice(0, 2).map((genre, index) => (
                <span
                  key={index}
                  className='chip border-accent/20 bg-accent-soft text-accent'
                >
                  {genre}
                </span>
              ))}
            </span>
          )}
          <ArrowRight
            className='h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent'
            strokeWidth={1.5}
            aria-hidden='true'
          />
        </span>
      </button>
    </li>
  )
}
