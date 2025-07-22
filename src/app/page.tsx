"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { SearchBar } from "@/components/search/SearchBar"
import { SearchResults } from "@/components/search/SearchResults"
import { ArtistProfile } from "@/components/artist/ArtistProfile"
import { AppStats } from "@/components/common/AppStats"
import { sparqlService, type ArtistInfo } from "@/services/sparqlService"

interface SearchFilters {
  genre?: string
  decade?: string
  country?: string
  artistType?: "solo" | "band" | "composer"
}

const SPARQL_ENDPOINTS = [
  { label: "Wikidata", value: "https://query.wikidata.org/sparql" },
  { label: "DBpedia", value: "https://dbpedia.org/sparql" },
]

export default function Home() {
  const [searchResults, setSearchResults] = useState<ArtistInfo[]>([])
  const [selectedArtist, setSelectedArtist] = useState<ArtistInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [endpoint, setEndpoint] = useState(SPARQL_ENDPOINTS[0].value)

  // Limpiar artista y resultados al cambiar endpoint
  function handleEndpointChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setEndpoint(e.target.value)
    setSelectedArtist(null)
    setSearchResults([])
    setSearchTerm("")
  }

  const handleSearch = async (term: string, filters: SearchFilters) => {
    console.log(
      "Handling search for term:",
      term,
      "with filters:",
      filters,
      "endpoint:",
      endpoint
    )
    if (!term.trim() && !Object.values(filters).some(Boolean)) return

    setIsLoading(true)
    setSearchTerm(term)
    setSelectedArtist(null)

    try {
      // Pasar los filtros a la búsqueda
      const results = await sparqlService.searchArtist(term, filters, endpoint)
      setSearchResults(results)
    } catch (error) {
      console.error("Error searching:", error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleArtistSelect = (artist: ArtistInfo) => {
    setSelectedArtist(artist)
  }

  const handleBack = () => {
    setSelectedArtist(null)
    // Mantener los resultados de búsqueda cuando regresamos
  }

  // Si hay un artista seleccionado, mostrar su perfil
  if (selectedArtist) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-deep-night via-acoustic-gray to-deep-night p-6'>
        <ArtistProfile
          artist={selectedArtist}
          onBack={handleBack}
          endpoint={endpoint}
        />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-deep-night via-acoustic-gray to-deep-night'>
      {/* Header con Logo y selector de endpoint */}
      <header className='flex justify-between items-center py-8 px-6'>
        <div className='flex items-center gap-4'>
          <div className='relative'>
            <Image
              src='/musigraph-logo-vector.svg'
              alt='MusiGraph Logo'
              width={60}
              height={60}
              className='drop-shadow-lg'
            />
          </div>
          <h1 className='text-3xl font-bold text-white'>
            Musi<span className='text-coral-vibrant'>Graph</span>
          </h1>
        </div>
        {/* Selector de endpoint */}
        <div className='flex items-center gap-4'>
          <label htmlFor='endpoint-select' className='text-white text-sm mr-2'>
            Endpoint:
          </label>
          <select
            id='endpoint-select'
            value={endpoint}
            onChange={handleEndpointChange}
            className='bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
          >
            {SPARQL_ENDPOINTS.map((opt) => (
              <option key={opt.value} value={opt.value} className='text-black'>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Enlace a tests (solo en desarrollo) */}
          <div className='hidden md:block'>
            <Link
              href='/test'
              className='px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm'
            >
              🧪 Tests
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className='flex flex-col items-center justify-center px-6 py-12 max-w-6xl mx-auto'>
        {/* Título Principal */}
        <div className='text-center mb-12'>
          <h2 className='text-4xl md:text-5xl font-extrabold text-white mb-4'>
            Explora el Universo Musical
          </h2>
          <p className='text-lg text-gray-300 max-w-2xl'>
            Descubre relaciones entre artistas, géneros musicales, influencias y
            colaboraciones a través de datos semánticos conectados.
          </p>
        </div>
        {/* Barra de Búsqueda */}
        <div className='w-full mb-12'>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>{" "}
        {/* Estadísticas de la app (solo cuando no hay búsqueda) */}
        {!searchTerm && <AppStats />}
        {/* Resultados de Búsqueda */}
        <div className='w-full'>
          <SearchResults
            results={searchResults}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onArtistSelect={handleArtistSelect}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className='text-center py-8 text-gray-400'>
        <p className='mb-2'>
          Datos proporcionados por{" "}
          {endpoint.includes("dbpedia") ? (
            <a
              href='https://dbpedia.org'
              target='_blank'
              rel='noopener noreferrer'
              className='text-coral-vibrant hover:text-coral-vibrant/80 transition-colors'
            >
              DBpedia
            </a>
          ) : (
            <a
              href='https://wikidata.org'
              target='_blank'
              rel='noopener noreferrer'
              className='text-coral-vibrant hover:text-coral-vibrant/80 transition-colors'
            >
              Wikidata
            </a>
          )}
        </p>
        <p className='text-sm'>MusiGraph - Explorador Musical Semántico</p>
      </footer>
    </div>
  )
}
