"use client"

import Link from "next/link"
import Image from "next/image"
import { FlaskConical } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"

interface HeaderProps {
  endpoint: string
  onEndpointChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

const SPARQL_ENDPOINTS = [
  { label: "Wikidata", value: "https://query.wikidata.org/sparql" },
  { label: "DBpedia", value: "https://dbpedia.org/sparql" },
]

export function Header({ endpoint, onEndpointChange }: HeaderProps) {
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
        <label htmlFor='endpoint-select' className='text-muted text-sm hidden sm:block'>
          Endpoint:
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

        <div className='hidden md:block'>
          <Link
            href='/test'
            className='px-3 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-surface-elevated transition-colors text-sm flex items-center gap-1'
          >
            <FlaskConical className="w-4 h-4" /> Tests
          </Link>
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}
