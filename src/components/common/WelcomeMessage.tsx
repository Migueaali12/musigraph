"use client"

import { useState, useEffect } from "react"
import { Music, Lightbulb, Globe, Search, BarChart3 } from "lucide-react"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface WelcomeMessageProps {
  dict: Dictionary
}

export function WelcomeMessage({ dict }: WelcomeMessageProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const examples = [
    "The Beatles",
    "Pink Floyd",
    "Queen",
    "Bob Dylan",
    "Miles Davis",
    "Radiohead",
  ]

  if (!isVisible) return null

  return (
    <div className='text-center mb-8 animate-in fade-in duration-1000'>
      <div className='bg-surface border border-border rounded-2xl p-8 shadow-sm'>
        <h3 className='text-2xl font-bold text-foreground mb-4 flex items-center justify-center gap-1'>
          {dict.welcome.title} <Music className="w-6 h-6" />
        </h3>
        <p className='text-muted mb-6 max-w-2xl mx-auto'>
          {dict.welcome.description}
        </p>

        <div className='mb-4'>
          <p className='text-sm text-muted mb-3 flex items-center justify-center gap-1'>
            <Lightbulb className="w-4 h-4" /> {dict.welcome.trySearch}
          </p>
          <div className='flex flex-wrap justify-center gap-2'>
            {examples.map((artist, index) => (
              <span
                key={index}
                className='px-3 py-1 bg-coral-vibrant/15 text-coral-vibrant rounded-full text-sm font-medium'
              >
                {artist}
              </span>
            ))}
          </div>
        </div>

        <div className='text-xs text-muted space-y-1'>
          <p className="flex items-center justify-center gap-1"><Globe className="w-4 h-4" /> {dict.welcome.realTimeData}</p>
          <p className="flex items-center justify-center gap-1"><Search className="w-4 h-4" /> {dict.welcome.smartSearch}</p>
          <p className="flex items-center justify-center gap-1"><BarChart3 className="w-4 h-4" /> {dict.welcome.interactiveViz}</p>
        </div>
      </div>
    </div>
  )
}
