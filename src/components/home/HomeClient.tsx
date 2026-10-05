"use client"

import { useState } from "react"
import { SearchBar } from "@/components/search/SearchBar"
import { SearchResults } from "@/components/search/SearchResults"
import { ArtistProfile } from "@/components/artist/ArtistProfile"
import { AppStats } from "@/components/common/AppStats"
import { Header } from "@/components/common/Header"
import { sparqlService, type ArtistInfo } from "@/services/sparqlService"
import type { Dictionary, Locale } from "@/dictionaries/getDictionary"

interface SearchFilters {
  genre?: string
  decade?: string
  country?: string
  artistType?: "solo" | "band" | "composer"
}

interface HomeClientProps {
  dict: Dictionary
  locale: Locale
}

export function HomeClient({ dict, locale }: HomeClientProps) {
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
          dict={dict}
        />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background text-foreground transition-colors duration-300'>
      <Header endpoint={endpoint} onEndpointChange={handleEndpointChange} dict={dict} locale={locale} />

      <main className='mx-auto max-w-6xl px-6 py-10'>
        {!searchTerm ? (
          <section className='grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center'>
            <div>
              <p className='mb-4 font-mono text-xs uppercase tracking-[0.18em] text-coral-deep dark:text-coral-vibrant'>
                {dict.home.eyebrow}
              </p>
              <h1 className='text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl'>
                {dict.home.title}
              </h1>
              <p className='mt-4 max-w-[58ch] text-lg text-muted-foreground'>
                {dict.home.subtitle}
              </p>
              <div className='mt-8'>
                <SearchBar onSearch={handleSearch} isLoading={isLoading} dict={dict} />
              </div>
            </div>
            <div className='hidden lg:block'>
              <AppStats dict={dict} />
            </div>
          </section>
        ) : (
          <div className='mb-8'>
            <SearchBar onSearch={handleSearch} isLoading={isLoading} dict={dict} />
          </div>
        )}

        <div className='mt-10'>
          <SearchResults
            results={searchResults}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onArtistSelect={handleArtistSelect}
            dict={dict}
          />
        </div>
      </main>

      <footer className='py-8 text-center text-muted-foreground'>
        <p className='mb-2'>
          {dict.home.providedBy}{" "}
          {endpoint.includes("dbpedia") ? (
            <a href='https://dbpedia.org' target='_blank' rel='noopener noreferrer' className='text-coral-deep transition-colors hover:text-coral-deep/80 dark:text-coral-vibrant dark:hover:text-coral-vibrant/80'>DBpedia</a>
          ) : (
            <a href='https://wikidata.org' target='_blank' rel='noopener noreferrer' className='text-coral-deep transition-colors hover:text-coral-deep/80 dark:text-coral-vibrant dark:hover:text-coral-vibrant/80'>Wikidata</a>
          )}
        </p>
        <p className='text-sm'>{dict.home.footerText}</p>
      </footer>
    </div>
  )
}
