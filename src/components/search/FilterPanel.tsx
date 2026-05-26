"use client"

import { SEARCH_FILTERS, QUICK_SEARCH_TERMS } from "@/utils/constants"
import type { SearchFilters } from "./SearchBar"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface FilterPanelProps {
  filters: SearchFilters
  onFilterChange: (filters: SearchFilters) => void
  dict: Dictionary
}

export function FilterPanel({ filters, onFilterChange, dict }: FilterPanelProps) {
  return (
    <div className='bg-surface border border-border rounded-2xl p-6 mb-6 shadow-sm'>
      <h3 className='text-foreground text-lg font-semibold mb-4'>
        {dict.search.advancedFilters}
      </h3>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Genre */}
        <div>
          <label className='block text-sm font-medium text-muted-foreground mb-2'>
            {dict.search.genre}
          </label>
          <select
            value={filters.genre ?? ""}
            onChange={(e) =>
              onFilterChange({ ...filters, genre: e.target.value || undefined })
            }
            className='w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
          >
            <option value=''>{dict.search.allGenres}</option>
            {SEARCH_FILTERS.GENRES.map((genre) => (
              <option key={genre.value} value={genre.value}>
                {genre.label}
              </option>
            ))}
          </select>
        </div>

        {/* Decade */}
        <div>
          <label className='block text-sm font-medium text-muted-foreground mb-2'>
            {dict.search.decade}
          </label>
          <select
            value={filters.decade ?? ""}
            onChange={(e) =>
              onFilterChange({ ...filters, decade: e.target.value || undefined })
            }
            className='w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
          >
            <option value=''>{dict.search.allDecades}</option>
            {SEARCH_FILTERS.DECADES.map((decade) => (
              <option key={decade.value} value={decade.value}>
                {decade.label}
              </option>
            ))}
          </select>
        </div>

        {/* Artist Type */}
        <div>
          <label className='block text-sm font-medium text-muted-foreground mb-2'>
            {dict.search.artistType}
          </label>
          <select
            value={filters.artistType ?? ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                artistType: (e.target.value || undefined) as SearchFilters["artistType"],
              })
            }
            className='w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
          >
            <option value=''>{dict.search.allTypes}</option>
            <option value='solo'>{dict.search.solo}</option>
            <option value='band'>{dict.search.band}</option>
            <option value='composer'>{dict.search.composer}</option>
          </select>
        </div>

        {/* Clear */}
        <div className='flex items-end'>
          <button
            type='button'
            onClick={() => onFilterChange({})}
            className='w-full px-4 py-2 bg-surface-elevated border border-border text-foreground rounded-lg hover:bg-border transition-colors'
          >
            {dict.search.clearFilters}
          </button>
        </div>
      </div>
    </div>
  )
}

// Re-export for convenience
export { QUICK_SEARCH_TERMS }
