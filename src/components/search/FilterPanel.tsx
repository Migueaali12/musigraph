"use client"

import { X } from "lucide-react"
import { SEARCH_FILTERS } from "@/utils/constants"
import { Select, type SelectOption } from "@/components/common/Select"
import type { SearchFilters } from "./SearchBar"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface FilterPanelProps {
  filters: SearchFilters
  onFilterChange: (filters: SearchFilters) => void
  dict: Dictionary
}

const labelClass =
  "mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted"

export function FilterPanel({ filters, onFilterChange, dict }: FilterPanelProps) {
  const genreOptions: SelectOption[] = [
    { value: "", label: dict.search.allGenres },
    ...SEARCH_FILTERS.GENRES.map((genre) => ({
      value: genre.value,
      label: genre.label,
    })),
  ]

  const decadeOptions: SelectOption[] = [
    { value: "", label: dict.search.allDecades },
    ...SEARCH_FILTERS.DECADES.map((decade) => ({
      value: decade.value,
      label: decade.label,
    })),
  ]

  const typeOptions: SelectOption[] = [
    { value: "", label: dict.search.allTypes },
    { value: "solo", label: dict.search.solo },
    { value: "band", label: dict.search.band },
    { value: "composer", label: dict.search.composer },
  ]

  return (
    <div className='rounded-md border border-border bg-surface p-5'>
      <h3 className='mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted'>
        {dict.search.advancedFilters}
      </h3>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {/* Genre */}
        <div>
          <label htmlFor='filter-genre' className={labelClass}>
            {dict.search.genre}
          </label>
          <Select
            id='filter-genre'
            value={filters.genre ?? ""}
            onChange={(value) =>
              onFilterChange({ ...filters, genre: value || undefined })
            }
            options={genreOptions}
            className='w-full'
          />
        </div>

        {/* Decade */}
        <div>
          <label htmlFor='filter-decade' className={labelClass}>
            {dict.search.decade}
          </label>
          <Select
            id='filter-decade'
            value={filters.decade ?? ""}
            onChange={(value) =>
              onFilterChange({ ...filters, decade: value || undefined })
            }
            options={decadeOptions}
            className='w-full'
          />
        </div>

        {/* Artist Type */}
        <div>
          <label htmlFor='filter-type' className={labelClass}>
            {dict.search.artistType}
          </label>
          <Select
            id='filter-type'
            value={filters.artistType ?? ""}
            onChange={(value) =>
              onFilterChange({
                ...filters,
                artistType: (value || undefined) as SearchFilters["artistType"],
              })
            }
            options={typeOptions}
            className='w-full'
          />
        </div>

        {/* Clear */}
        <div className='flex items-end'>
          <button
            type='button'
            onClick={() => onFilterChange({})}
            className='link inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-accent'
          >
            <X className='h-3.5 w-3.5' strokeWidth={1.5} aria-hidden='true' />
            {dict.search.clearFilters}
          </button>
        </div>
      </div>
    </div>
  )
}
