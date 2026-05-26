"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Globe, ChevronDown, Check } from "lucide-react"
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
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langMenuRef = useRef<HTMLDivElement>(null)
  const langButtonRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isLangOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(e.target as Node) &&
        !langButtonRef.current?.contains(e.target as Node)
      ) {
        setIsLangOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isLangOpen])

  // Close on Escape
  useEffect(() => {
    if (!isLangOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLangOpen(false)
        langButtonRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isLangOpen])

  const handleLanguageChange = (newLocale: Locale) => {
    setIsLangOpen(false)
    if (newLocale === locale) return
    const pathWithoutLocale = pathname.replace(/^\/(en|es)/, "") || "/"
    window.location.href = `/${newLocale}${pathWithoutLocale}`
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
            priority
          />
        </div>
        <h2 className='text-2xl font-bold text-foreground'>
          Musi<span className='text-coral-vibrant'>Graph</span>
        </h2>
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

        {/* Language dropdown — keyboard accessible */}
        <div className='relative'>
          <button
            ref={langButtonRef}
            onClick={() => setIsLangOpen((prev) => !prev)}
            className='flex items-center gap-2 bg-surface border border-border text-foreground rounded-lg px-3 py-2 text-sm hover:border-coral-vibrant/50 transition-colors focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
            aria-label={dict.header.language}
            aria-haspopup='menu'
            aria-expanded={isLangOpen}
          >
            <Globe size={16} />
            <span className='font-medium'>{dict.header[locale]}</span>
            <ChevronDown
              size={14}
              className={`text-muted transition-transform duration-200 ${isLangOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isLangOpen && (
            <div
              ref={langMenuRef}
              role='menu'
              aria-label={dict.header.language}
              className='absolute right-0 top-full mt-2 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]'
            >
              {LANGUAGES.map((lang) => {
                const isActive = lang.code === locale
                return (
                  <button
                    key={lang.code}
                    role='menuitem'
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-coral-vibrant/10 transition-colors ${
                      isActive
                        ? "bg-coral-vibrant/10 text-coral-vibrant font-medium"
                        : "text-foreground"
                    }`}
                  >
                    <span>{lang.label}</span>
                    {isActive && <Check size={14} className='ml-auto text-coral-vibrant' />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}
