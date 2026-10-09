"use client"

import { Globe, Search, BarChart3 } from "lucide-react"
import { QUICK_SEARCH_TERMS } from "@/utils/constants"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface WelcomeMessageProps {
  dict: Dictionary
  onSearch: (term: string) => void
}

export function WelcomeMessage({ dict, onSearch }: WelcomeMessageProps) {
  const features = [
    { icon: Globe, text: dict.welcome.realTimeData },
    { icon: Search, text: dict.welcome.smartSearch },
    { icon: BarChart3, text: dict.welcome.interactiveViz },
  ]

  return (
    <section
      aria-labelledby='welcome-heading'
      style={{ animationDelay: "120ms" }}
      className='animate-rise mt-12 border-t border-border pt-8'
    >
      <h2
        id='welcome-heading'
        className='mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted'
      >
        {dict.welcome.trySearch}
      </h2>

      <ul className='flex flex-wrap gap-x-6 gap-y-2'>
        {QUICK_SEARCH_TERMS.map((term) => (
          <li key={term}>
            <button
              type='button'
              onClick={() => onSearch(term)}
              className='link text-[15px] font-bold hover:text-accent'
            >
              {term}
            </button>
          </li>
        ))}
      </ul>

      <ul className='mt-8 grid gap-4 sm:grid-cols-3'>
        {features.map(({ icon: Icon, text }) => (
          <li key={text} className='flex items-start gap-3'>
            <Icon
              className='mt-0.5 h-4 w-4 shrink-0 text-accent'
              strokeWidth={1.5}
              aria-hidden='true'
            />
            <span className='text-[13px] leading-relaxed text-muted'>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
