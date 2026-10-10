"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Globe } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { Select, type SelectOption } from "./Select"
import { GitHub } from "../Github"
import { PROVIDERS, SELECTABLE_PROVIDERS, type ProviderId } from "@/services/providers"
import type { Dictionary, Locale } from "@/dictionaries/getDictionary"

interface HeaderProps {
  provider: ProviderId
  onProviderChange: (value: string) => void
  dict: Dictionary
  locale: Locale
}

export function Header({
  provider,
  onProviderChange,
  dict,
  locale,
}: HeaderProps) {
  const pathname = usePathname()

  const providerOptions: SelectOption[] = SELECTABLE_PROVIDERS.map((id) => ({
    value: id,
    label: PROVIDERS[id].label,
  }))

  const languageOptions: SelectOption[] = [
    { value: "en", label: "English", display: dict.header.en },
    { value: "es", label: "Español", display: dict.header.es },
  ]

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return
    const pathWithoutLocale = pathname.replace(/^\/(en|es)/, "") || "/"
    // Full reload on purpose: it resets client state (search results, selected
    // artist) so the whole UI switches language consistently.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/${newLocale}${pathWithoutLocale}`
  }

  return (
    <header className='sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-sm'>
      <div className='mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6'>
        <Link href={`/${locale}`} className='flex items-center gap-2.5'>
          <Image
            src='/musigraph-logo-vector.svg'
            alt='MusiGraph Logo'
            width={28}
            height={28}
            className='h-6 w-6 sm:h-7 sm:w-7'
            priority
          />
          <span className='text-base font-bold tracking-tight sm:text-lg'>
            Musi<span className='text-accent'>Graph</span>
          </span>
        </Link>

        <div className='flex items-center gap-1.5 sm:gap-2'>
          <label
            htmlFor='provider-select'
            className='hidden text-xs text-muted lg:block'
          >
            {dict.header.dataSource}
          </label>
          <Select
            id='provider-select'
            ariaLabel={dict.header.dataSource}
            value={provider}
            onChange={onProviderChange}
            options={providerOptions}
            align='right'
          />

          <Select
            id='language-select'
            ariaLabel={dict.header.language}
            value={locale}
            onChange={handleLanguageChange}
            options={languageOptions}
            icon={<Globe size={14} strokeWidth={1.5} aria-hidden='true' />}
            align='right'
          />

          <a
            href='https://github.com/Migueaali12/musigraph'
            target='_blank'
            rel='noopener noreferrer'
            className='control control-icon hidden md:inline-flex'
            aria-label='View source on GitHub'
          >
            <GitHub className='h-4 w-4' />
          </a>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
