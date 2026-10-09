"use client"

import { useState } from "react"
import { SearchBar } from "@/components/search/SearchBar"
import { SearchResults } from "@/components/search/SearchResults"
import { ArtistProfile } from "@/components/artist/ArtistProfile"
import { AppStats } from "@/components/common/AppStats"
import { WelcomeMessage } from "@/components/common/WelcomeMessage"
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

  function handleEndpointChange(value: string) {
    setEndpoint(value)
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
    window.scrollTo({ top: 0 })
  }

  const handleBack = () => {
    setSelectedArtist(null)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className='min-h-screen text-foreground'>
      <Header endpoint={endpoint} onEndpointChange={handleEndpointChange} dict={dict} locale={locale} />

      {selectedArtist ? (
        <main className='mx-auto max-w-6xl px-4 py-10 sm:px-6'>
          <ArtistProfile
            artist={selectedArtist}
            onBack={handleBack}
            endpoint={endpoint}
            dict={dict}
          />
        </main>
      ) : (
        <main className='mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14'>
          {/* Hero: headline + search on the left, legend on the right */}
          <section className='grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14'>
            <div className='relative z-20 animate-rise'>
              <h1 className='mb-4 text-3xl font-bold tracking-tight sm:text-4xl'>
                {dict.home.title}
              </h1>
              <p className='mb-8 max-w-prose text-[15px] leading-relaxed text-muted'>
                {dict.home.subtitle}
              </p>
              <SearchBar onSearch={handleSearch} isLoading={isLoading} dict={dict} />
            </div>

            <AppStats dict={dict} />
          </section>

          {!searchTerm && (
            <WelcomeMessage dict={dict} onSearch={(term) => handleSearch(term, {})} />
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
      )}

      <footer className='border-t border-border py-8 text-center text-xs text-muted'>
        <p>
          {dict.home.providedBy}{" "}
          {endpoint.includes("dbpedia") ? (
            <a
              href='https://dbpedia.org'
              target='_blank'
              rel='noopener noreferrer'
              className='link text-accent'
            >
              DBpedia
            </a>
          ) : (
            <a
              href='https://wikidata.org'
              target='_blank'
              rel='noopener noreferrer'
              className='link text-accent'
            >
              Wikidata
            </a>
          )}
        </p>
        <p className='mt-1'>{dict.home.footerText}</p>
      </footer>
    </div>
  )
}
