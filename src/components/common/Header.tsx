"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { Globe, ChevronDown } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import type { Dictionary, Locale } from "@/dictionaries/getDictionary"

interface HeaderProps {
  endpoint: string
  onEndpointChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  dict: Dictionary
  locale: Locale
}

const SPARQL_ENDPOINTS = [
  { label: "Wikidata", value: "https://query.wikidata.org/sparql" },
  { label: "DBpedia", value: "https://dbpedia.org/sparql" },
]

const LANGUAGES = [
  { code: "en" as Locale, label: "English" },
  { code: "es" as Locale, label: "Español" },
]

export function Header({
  endpoint,
  onEndpointChange,
  dict,
  locale,
}: HeaderProps) {
  const pathname = usePathname()

  const handleLanguageChange = (newLocale: Locale) => {
    if (newLocale === locale) return

    // Get the path after the locale segment
    const pathWithoutLocale = pathname.replace(/^\/(en|es)/, "") || "/"
    const newPath = `/${newLocale}${pathWithoutLocale}`

    window.location.href = newPath
  }

  return (
    <header className='flex justify-between items-center py-6 px-6 border-b border-border bg-surface/80 backdrop-blur-sm'>
      <div className='flex items-center gap-4'>
        <div className='relative'>
          <Image
            src='/musigraph-logo-vector.svg'
            alt='MusiGraph Logo'
            width={48}
            height={48}
            className='drop-shadow-md'
          />
        </div>
        <h1 className='text-2xl font-bold text-foreground'>
          Musi<span className='text-coral-vibrant'>Graph</span>
        </h1>
      </div>

      <div className='flex items-center gap-3'>
        <label
          htmlFor='endpoint-select'
          className='text-muted text-sm hidden sm:block'
        >
          {dict.header.endpoint}
        </label>
        <select
          id='endpoint-select'
          value={endpoint}
          onChange={onEndpointChange}
          className='bg-surface border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral-vibrant transition-colors'
        >
          {SPARQL_ENDPOINTS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className='relative group'>
          <button
            className='flex items-center gap-2 bg-surface border border-border text-foreground rounded-lg px-3 py-2 text-sm hover:border-coral-vibrant/50 transition-colors focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
            aria-label={dict.header.language}
            aria-haspopup='true'
            aria-expanded='false'
          >
            <Globe size={16} />

            <span className='font-medium'>{dict.header[locale]}</span>
            <ChevronDown size={14} className='text-muted' />
          </button>

          <div className='absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]'>
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === locale
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-coral-vibrant/10 transition-colors ${
                    isActive
                      ? "bg-coral-vibrant/10 text-coral-vibrant font-medium"
                      : "text-foreground"
                  }`}
                >
                  <span>{lang.label}</span>
                  {isActive && (
                    <span className='ml-auto text-coral-vibrant'>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}
