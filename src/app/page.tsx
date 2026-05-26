"use client"

import { useState } from "react"
import { SearchBar } from "@/components/search/SearchBar"
import { SearchResults } from "@/components/search/SearchResults"
import { ArtistProfile } from "@/components/artist/ArtistProfile"
import { AppStats } from "@/components/common/AppStats"
import { Header } from "@/components/common/Header"
import { sparqlService, type ArtistInfo } from "@/services/sparqlService"

interface SearchFilters {
  genre?: string
  decade?: string
  country?: string
  artistType?: "solo" | "band" | "composer"
}

export default function Home() {
  const [searchResults, setSearchResults] = useState<ArtistInfo[]>([])
  const [selectedArtist, setSelectedArtist] = useState<ArtistInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [endpoint, setEndpoint] = useState("https://query.wikidata.org/sparql")

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
  }

  if (selectedArtist) {
    return (
      <div className='min-h-screen bg-background text-foreground transition-colors duration-300 p-6'>
        <ArtistProfile
          artist={selectedArtist}
          onBack={handleBack}
          endpoint={endpoint}
        />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background text-foreground transition-colors duration-300'>
      <Header endpoint={endpoint} onEndpointChange={handleEndpointChange} />

      {/* Contenido Principal */}
      <main className='flex flex-col items-center justify-center px-6 py-12 max-w-6xl mx-auto'>
        {/* Título Principal */}
        <div className='text-center mb-12'>
          <h2 className='text-4xl md:text-5xl font-extrabold text-foreground mb-4'>
            Explora el Universo Musical
          </h2>
          <p className='text-lg text-muted max-w-2xl'>
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
      <footer className='text-center py-8 text-muted'>
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
