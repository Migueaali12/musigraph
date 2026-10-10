"use client"

import { useState } from "react"
import { FilterPanel } from "./FilterPanel"
import { Search, SlidersHorizontal } from "lucide-react"
import type { Dictionary } from "@/dictionaries/getDictionary"
import type { SearchFilters } from "@/services/sparqlTypes"

// Re-exported for consumers that historically imported the type from here.
export type { SearchFilters }

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

  return (
    <div className='w-full'>
      <form onSubmit={handleSubmit}>
        <div className='relative'>
          <span
            aria-hidden='true'
            className='pointer-events-none absolute inset-y-0 left-4 flex select-none items-center text-sm font-bold text-accent'
          >
            &gt;
          </span>
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={dict.search.placeholder}
            aria-label={dict.search.placeholder}
            className='h-12 w-full rounded-sm border border-border bg-surface pl-10 pr-40 text-base placeholder:text-muted transition-colors focus:border-foreground sm:pr-56'
            disabled={isLoading}
          />
          <div className='absolute inset-y-0 right-2 flex items-center gap-1.5'>
            <button
              type='button'
              onClick={() => setShowFilters((prev) => !prev)}
              className='control'
              disabled={isLoading}
              aria-expanded={showFilters}
              aria-controls='filter-panel'
            >
              <SlidersHorizontal className='h-4 w-4' strokeWidth={1.5} aria-hidden='true' />
              <span className='hidden sm:inline'>{dict.search.filters}</span>
            </button>
            <button
              type='submit'
              disabled={isLoading || !hasInput}
              className='btn btn-primary'
            >
              <Search className='h-3.5 w-3.5 sm:hidden' strokeWidth={1.5} aria-hidden='true' />
              <span className='hidden sm:inline'>
                {isLoading ? dict.search.searching : dict.search.search}
              </span>
              <span className='sm:hidden sr-only'>
                {isLoading ? dict.search.searching : dict.search.search}
              </span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div id='filter-panel' className='mt-3'>
            <FilterPanel
              filters={filters}
              onFilterChange={setFilters}
              dict={dict}
            />
          </div>
        )}
      </form>
    </div>
  )
}
