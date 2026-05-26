"use client"

import { useState } from "react"
import { WIKIDATA_ENTITIES } from "@/utils/constants"
import { Search, SlidersHorizontal } from "lucide-react"
import type { Dictionary } from "@/dictionaries/getDictionary"

export interface SearchFilters {
  genre?: string
  decade?: string
  country?: string
  artistType?: "solo" | "band" | "composer"
}

interface SearchBarProps {
  onSearch: (term: string, filters: SearchFilters) => void
  isLoading: boolean
  dict: Dictionary
}

export function SearchBar({ onSearch, isLoading, dict }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim() || Object.values(filters).some(Boolean)) {
      onSearch(searchTerm.trim(), filters)
    }
  }

  const handleQuickSearch = (term: string) => {
    setSearchTerm(term)
    onSearch(term, filters)
  }

  function handleFilterChange(newFilters: SearchFilters) {
    setFilters(newFilters)
  }

  const genres = [
    { id: WIKIDATA_ENTITIES.ROCK, label: "Rock" },
    { id: WIKIDATA_ENTITIES.JAZZ, label: "Jazz" },
    { id: WIKIDATA_ENTITIES.POP, label: "Pop" },
    { id: WIKIDATA_ENTITIES.HIP_HOP, label: "Hip Hop" },
    { id: WIKIDATA_ENTITIES.ELECTRONIC, label: dict.search.electronic },
    { id: WIKIDATA_ENTITIES.BLUES, label: "Blues" },
  ]

  const decades = [
    { value: "1950", label: "1950s" },
    { value: "1960", label: "1960s" },
    { value: "1970", label: "1970s" },
    { value: "1980", label: "1980s" },
    { value: "1990", label: "1990s" },
    { value: "2000", label: "2000s" },
    { value: "2010", label: "2010s" },
  ]

  const quickSearchTerms = [
    "The Beatles",
    "Pink Floyd",
    "Queen",
    "Bob Dylan",
    "Elvis Presley",
    "Michael Jackson",
  ]

  return (
    <div className='w-full max-w-4xl mx-auto'>
      <form onSubmit={handleSubmit} className='mb-6'>
        <div className='relative'>
          <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
            <Search className='w-5 h-5 text-muted z-10' />
          </div>
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={dict.search.placeholder}
            className='w-full pl-12 pr-36 py-4 bg-surface border border-border rounded-2xl text-foreground placeholder-muted text-lg focus:outline-none focus:ring-2 focus:ring-coral-vibrant focus:border-transparent transition-all shadow-sm'
            disabled={isLoading}
          />
          <div className='absolute inset-y-0 right-0 flex items-center'>
            <button
              type='button'
              onClick={() => setShowFilters(!showFilters)}
              className='mr-2 px-3 py-2 bg-surface-elevated border border-border text-foreground rounded-lg hover:bg-border transition-colors text-sm flex items-center gap-1.5'
              disabled={isLoading}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {dict.search.filters}
            </button>
            <button
              type='submit'
              disabled={
                isLoading ||
                (!searchTerm.trim() && !Object.values(filters).some(Boolean))
              }
              className='mr-2 px-6 py-2 bg-gradient-energy text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 text-sm'
            >
              {isLoading ? dict.search.searching : dict.search.search}
            </button>
          </div>
        </div>
      </form>

      {showFilters && (
        <div className='bg-surface border border-border rounded-2xl p-6 mb-6 shadow-sm'>
          <h3 className='text-foreground text-lg font-semibold mb-4'>
            {dict.search.advancedFilters}
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <div>
              <label className='block text-sm font-medium text-muted-foreground mb-2'>
                {dict.search.genre}
              </label>
              <select
                value={filters.genre || ""}
                onChange={(e) => {
                  const newFilters = {
                    ...filters,
                    genre: e.target.value || undefined,
                  }
                  handleFilterChange(newFilters)
                }}
                className='w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
              >
                <option value=''>{dict.search.allGenres}</option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='block text-sm font-medium text-muted-foreground mb-2'>
                {dict.search.decade}
              </label>
              <select
                value={filters.decade || ""}
                onChange={(e) => {
                  const newFilters = {
                    ...filters,
                    decade: e.target.value || undefined,
                  }
                  handleFilterChange(newFilters)
                }}
                className='w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
              >
                <option value=''>{dict.search.allDecades}</option>
                {decades.map((decade) => (
                  <option key={decade.value} value={decade.value}>
                    {decade.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='block text-sm font-medium text-muted-foreground mb-2'>
                {dict.search.artistType}
              </label>
              <select
                value={filters.artistType || ""}
                onChange={(e) => {
                  const newFilters = {
                    ...filters,
                    artistType: (e.target.value ||
                      undefined) as SearchFilters["artistType"],
                  }
                  handleFilterChange(newFilters)
                }}
                className='w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
              >
                <option value=''>{dict.search.allTypes}</option>
                <option value='solo'>{dict.search.solo}</option>
                <option value='band'>{dict.search.band}</option>
                <option value='composer'>{dict.search.composer}</option>
              </select>
            </div>

            <div className='flex items-end'>
              <button
                type='button'
                onClick={() => {
                  setFilters({})
                  handleFilterChange({})
                }}
                className='w-full px-4 py-2 bg-surface-elevated border border-border text-foreground rounded-lg hover:bg-border transition-colors'
              >
                {dict.search.clearFilters}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className='text-center'>
        <p className='text-muted-foreground text-sm mb-3'>{dict.search.popularSearches}</p>
        <div className='flex flex-wrap justify-center gap-2'>
          {quickSearchTerms.map((term) => (
            <button
              key={term}
              onClick={() => handleQuickSearch(term)}
              disabled={isLoading}
              className='px-4 py-2 bg-surface border border-border text-foreground rounded-full text-sm hover:border-coral-vibrant/50 hover:text-coral-vibrant transition-colors disabled:opacity-50'
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
