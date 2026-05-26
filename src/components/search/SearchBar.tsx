"use client"

import { useState } from "react"
import { QUICK_SEARCH_TERMS } from "@/utils/constants"
import { FilterPanel } from "./FilterPanel"
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

  const hasInput = searchTerm.trim() !== "" || Object.values(filters).some(Boolean)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (hasInput) {
      onSearch(searchTerm.trim(), filters)
    }
  }

  const handleQuickSearch = (term: string) => {
    setSearchTerm(term)
    onSearch(term, filters)
  }

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
              aria-expanded={showFilters}
              aria-controls='filter-panel'
            >
              <SlidersHorizontal className='w-4 h-4' />
              {dict.search.filters}
            </button>
            <button
              type='submit'
              disabled={isLoading || !hasInput}
              className='mr-2 px-6 py-2 bg-gradient-energy text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 text-sm'
            >
              {isLoading ? dict.search.searching : dict.search.search}
            </button>
          </div>
        </div>
      </form>

      {showFilters && (
        <div id='filter-panel'>
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            dict={dict}
          />
        </div>
      )}

      <div className='text-center'>
        <p className='text-muted-foreground text-sm mb-3'>{dict.search.popularSearches}</p>
        <div className='flex flex-wrap justify-center gap-2'>
          {QUICK_SEARCH_TERMS.map((term) => (
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
