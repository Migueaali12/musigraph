"use client"

import { useState } from "react"
import { WIKIDATA_ENTITIES } from "@/utils/constants"

export interface SearchFilters {
  genre?: string
  decade?: string
  country?: string
  artistType?: "solo" | "band" | "composer"
}

interface SearchBarProps {
  onSearch: (term: string, filters: SearchFilters) => void
  isLoading: boolean
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
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

  // Solo actualizar filtros, no disparar búsqueda automáticamente
  function handleFilterChange(newFilters: SearchFilters) {
    setFilters(newFilters)
  }

  const genres = [
    { id: WIKIDATA_ENTITIES.ROCK, label: "Rock" },
    { id: WIKIDATA_ENTITIES.JAZZ, label: "Jazz" },
    { id: WIKIDATA_ENTITIES.POP, label: "Pop" },
    { id: WIKIDATA_ENTITIES.HIP_HOP, label: "Hip Hop" },
    { id: WIKIDATA_ENTITIES.ELECTRONIC, label: "Electrónica" },
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
      {/* Campo de búsqueda principal */}
      <form onSubmit={handleSubmit} className='mb-6'>
        <div className='relative'>
          <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
            <svg
              className='w-6 h-6 text-gray-400 z-10'
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
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder='Buscar artista, banda o compositor...'
            className='w-full pl-12 pr-32 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-400 text-lg focus:outline-none focus:ring-2 focus:ring-coral-vibrant focus:border-transparent transition-all'
            disabled={isLoading}
          />
          <div className='absolute inset-y-0 right-0 flex items-center'>
            <button
              type='button'
              onClick={() => setShowFilters(!showFilters)}
              className='mr-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors'
              disabled={isLoading}
            >
              Filtros
            </button>
            <button
              type='submit'
              disabled={
                isLoading ||
                (!searchTerm.trim() && !Object.values(filters).some(Boolean))
              }
              className='mr-2 px-6 py-2 bg-gradient-energy text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50'
            >
              {isLoading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
      </form>

      {/* Filtros avanzados */}
      {showFilters && (
        <div className='bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/10'>
          <h3 className='text-white text-lg font-semibold mb-4'>
            Filtros Avanzados
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {/* Género */}
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Género Musical
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
                className='w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
              >
                <option value=''>Todos los géneros</option>
                {genres.map((genre) => (
                  <option
                    key={genre.id}
                    value={genre.id}
                    className='bg-acoustic-gray'
                  >
                    {genre.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Década */}
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Década
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
                className='w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
              >
                <option value=''>Todas las décadas</option>
                {decades.map((decade) => (
                  <option
                    key={decade.value}
                    value={decade.value}
                    className='bg-acoustic-gray'
                  >
                    {decade.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de artista */}
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Tipo de Artista
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
                className='w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
              >
                <option value=''>Todos los tipos</option>
                <option value='solo' className='bg-acoustic-gray'>
                  Solista
                </option>
                <option value='band' className='bg-acoustic-gray'>
                  Banda
                </option>
                <option value='composer' className='bg-acoustic-gray'>
                  Compositor
                </option>
              </select>
            </div>

            {/* Botón limpiar filtros */}
            <div className='flex items-end'>
              <button
                type='button'
                onClick={() => {
                  setFilters({})
                  handleFilterChange({})
                }}
                className='w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Búsquedas rápidas */}
      <div className='text-center'>
        <p className='text-gray-400 text-sm mb-3'>Búsquedas populares:</p>
        <div className='flex flex-wrap justify-center gap-2'>
          {quickSearchTerms.map((term) => (
            <button
              key={term}
              onClick={() => handleQuickSearch(term)}
              disabled={isLoading}
              className='px-4 py-2 bg-white/10 text-white rounded-full text-sm hover:bg-white/20 transition-colors disabled:opacity-50'
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
