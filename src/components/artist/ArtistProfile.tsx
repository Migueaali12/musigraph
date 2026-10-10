"use client"

import { useState, useEffect, useMemo } from "react"
import {
  type ArtistInfo,
  type AlbumInfo,
  type CollaborationInfo,
  type ArtistEnrichmentResult,
  sparqlService,
} from "@/services/sparqlService"
import {
  dataProcessor,
  type ProcessedArtistData,
} from "@/services/dataProcessor"
import Image from "next/image"
import {
  ArrowLeft,
  BarChart3,
  Disc,
  Handshake,
  Lightbulb,
} from "lucide-react"
import { getInitials, stripColon } from "@/utils/format"
import { getExternalLinks } from "@/utils/externalLinks"
import { extractYear } from "@/utils/date"
import { PROVIDERS, type ProviderId } from "@/services/providers"
import { Select, type SelectOption } from "@/components/common/Select"
import type { Dictionary, Locale } from "@/dictionaries/getDictionary"
import { OverviewTab } from "./tabs/OverviewTab"
import { DiscographyTab } from "./tabs/DiscographyTab"
import { InfluencesTab } from "./tabs/InfluencesTab"
import { CollaborationsTab } from "./tabs/CollaborationsTab"

// ── Static config hoisted outside component (no recreation on render) ──────

type TabType = "overview" | "discography" | "influences" | "collaborations"

const TAB_IDS: TabType[] = ["overview", "discography", "influences", "collaborations"]

function getTabIcon(id: TabType) {
  const iconProps = { className: "h-3.5 w-3.5", strokeWidth: 1.5, "aria-hidden": true } as const
  switch (id) {
    case "overview": return <BarChart3 {...iconProps} />
    case "discography": return <Disc {...iconProps} />
    case "influences": return <Lightbulb {...iconProps} />
    case "collaborations": return <Handshake {...iconProps} />
  }
}

const metaLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.14em] text-muted"

// ── Skeleton loader ────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className='space-y-3 py-2'>
      {[0, 1, 2].map((i) => (
        <div key={i} className='flex items-center gap-4 py-3'>
          <div className='h-10 w-10 shrink-0 animate-pulse rounded-sm bg-surface-elevated' />
          <div className='flex-1 space-y-2'>
            <div className='h-3.5 w-48 animate-pulse rounded-xs bg-surface-elevated' />
            <div className='h-3 w-72 max-w-full animate-pulse rounded-xs bg-surface-elevated' />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

interface ArtistProfileProps {
  artist: ArtistInfo
  onBack: () => void
  provider: ProviderId
  locale: Locale
  dict: Dictionary
}

export function ArtistProfile({
  artist,
  onBack,
  provider,
  locale,
  dict,
}: ArtistProfileProps) {
  const [discography, setDiscography] = useState<AlbumInfo[]>([])
  const [influences, setInfluences] = useState<ArtistInfo[]>([])
  const [collaborations, setCollaborations] = useState<CollaborationInfo[]>([])
  const [enrichment, setEnrichment] = useState<ArtistEnrichmentResult>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [imageError, setImageError] = useState(false)
  const [detailSource, setDetailSource] = useState<"endpoint" | "musicbrainz">(
    "endpoint"
  )

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setIsLoading(true)
      try {
        // Bio/members/genres arrive independently: never block the tabs on them.
        const enrichmentPromise = sparqlService
          .getArtistEnrichment(artist.id, provider, locale, { mbid: artist.mbid })
          .catch(() => ({}) as ArtistEnrichmentResult)

        if (detailSource === "musicbrainz" && artist.mbid) {
          const [mbDiscography, enrichmentData] = await Promise.all([
            sparqlService.getArtistDiscography(
              artist.id,
              { mbid: artist.mbid, source: "musicbrainz" },
              provider,
              locale
            ),
            enrichmentPromise,
          ])
          if (!cancelled) {
            setDiscography(mbDiscography)
            setInfluences([])
            setCollaborations([])
            setEnrichment(enrichmentData)
          }
        } else {
          const [discographyData, influencesData, collaborationsData, enrichmentData] =
            await Promise.all([
              sparqlService.getArtistDiscography(
                artist.id,
                {
                  mbid: artist.mbid,
                  discogsId: artist.externalIds?.discogs,
                  name: artist.name,
                },
                provider,
                locale
              ),
              sparqlService.getArtistInfluences(artist.id, provider, locale, artist.mbid),
              sparqlService.getCollaborations(artist.id, provider, locale, artist.mbid),
              enrichmentPromise,
            ])
          if (!cancelled) {
            setDiscography(discographyData)
            setInfluences(influencesData)
            setCollaborations(collaborationsData)
            setEnrichment(enrichmentData)
          }
        }
      } catch {
        // Data load failed — tabs will show empty states
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [
    artist.id,
    artist.mbid,
    artist.name,
    artist.externalIds?.discogs,
    provider,
    locale,
    detailSource,
  ])

  const processedData: ProcessedArtistData = useMemo(
    () =>
      dataProcessor.processArtistData(
        artist,
        discography,
        influences,
        collaborations
      ),
    [artist, discography, influences, collaborations]
  )

  // Wikidata genres ∪ MusicBrainz genres/tags (case-insensitive dedupe).
  const genres = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const genre of [...artist.genres, ...(enrichment.enrichment?.genres ?? [])]) {
      const key = genre.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      list.push(genre)
    }
    return list
  }, [artist.genres, enrichment.enrichment?.genres])

  const externalLinks = useMemo(
    () => getExternalLinks(artist.externalIds),
    [artist.externalIds]
  )

  const birthYear = extractYear(artist.birthDate)
  const canShowMusicBrainz = Boolean(artist.mbid)

  const sourceOptions: SelectOption[] = [
    {
      value: "endpoint",
      label: PROVIDERS[provider].label,
    },
    ...(canShowMusicBrainz
      ? [{ value: "musicbrainz", label: "MusicBrainz" }]
      : []),
  ]

  return (
    <div className='mx-auto max-w-6xl'>
      {/* Top bar: back + data source */}
      <div className='mb-8 flex flex-wrap items-center justify-between gap-3'>
        <button type='button' onClick={onBack} className='control'>
          <ArrowLeft className='h-3.5 w-3.5' strokeWidth={1.5} aria-hidden='true' />
          {dict.artist.backToSearch}
        </button>

        <div className='flex items-center gap-2'>
          <label htmlFor='data-source' className='text-xs text-muted'>
            {dict.artist.dataSource}
          </label>
          <Select
            id='data-source'
            value={detailSource}
            onChange={(value) =>
              setDetailSource(value as "endpoint" | "musicbrainz")
            }
            options={sourceOptions}
            disabled={!canShowMusicBrainz}
            align='right'
          />
        </div>
      </div>

      {/* Artist hero */}
      <section className='mb-8 grid gap-6 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-8'>
        <div className='relative h-40 w-40 shrink-0 overflow-hidden rounded-md border border-border'>
          {artist.image && !imageError ? (
            <Image
              src={artist.image}
              alt={artist.name}
              fill
              className='object-cover'
              onError={() => setImageError(true)}
              sizes='160px'
              priority
            />
          ) : (
            <div
              aria-hidden='true'
              className='flex h-full w-full items-center justify-center bg-surface-elevated text-3xl font-bold text-muted'
            >
              {getInitials(artist.name)}
            </div>
          )}
        </div>

        <div>
          <h1 className='mb-5 text-3xl font-bold tracking-tight sm:text-4xl'>
            {artist.name}
          </h1>

          <dl className='grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-3 text-sm'>
            {artist.country && (
              <>
                <dt className={metaLabelClass}>{stripColon(dict.artist.country)}</dt>
                <dd>{artist.country}</dd>
              </>
            )}

            {birthYear !== null && (
              <>
                <dt className={metaLabelClass}>{stripColon(dict.artist.year)}</dt>
                <dd>{birthYear}</dd>
              </>
            )}

            {artist.instruments.length > 0 && (
              <>
                <dt className={metaLabelClass}>{stripColon(dict.artist.instruments)}</dt>
                <dd className='flex flex-wrap gap-1.5'>
                  {artist.instruments.map((instrument, index) => (
                    <span
                      key={index}
                      className='chip border-blue/20 bg-blue-soft text-blue'
                    >
                      {instrument}
                    </span>
                  ))}
                </dd>
              </>
            )}

            {!isLoading && (
              <>
                <dt className={metaLabelClass}>{stripColon(dict.artist.albums)}</dt>
                <dd className='font-bold'>{processedData.statistics.totalAlbums}</dd>

                <dt className={metaLabelClass}>{stripColon(dict.artist.influences)}</dt>
                <dd className='font-bold'>{processedData.statistics.totalInfluences}</dd>

                <dt className={metaLabelClass}>{stripColon(dict.artist.collaborations)}</dt>
                <dd className='font-bold'>{processedData.statistics.totalCollaborations}</dd>
              </>
            )}
          </dl>

          {genres.length > 0 && (
            <div className='mt-6'>
              <h2 className={metaLabelClass}>{dict.artist.musicalGenres}</h2>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {genres.map((genre, index) => (
                  <span
                    key={index}
                    className='chip border-accent/20 bg-accent-soft text-accent'
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {externalLinks.length > 0 && (
            <div className='mt-6'>
              <h2 className={metaLabelClass}>{dict.artist.externalLinks}</h2>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {externalLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='chip border-border bg-surface text-muted hover:text-accent'
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tab navigation — editor style */}
      <div className='mb-6 overflow-x-auto'>
        <div role='tablist' className='flex min-w-max gap-1 border-b border-border'>
          {TAB_IDS.map((id) => {
            const label =
              id === "overview"
                ? dict.artist.overview
                : id === "discography"
                  ? dict.artist.discography
                  : id === "influences"
                    ? dict.artist.influencesTab
                    : dict.artist.collaborationsTab
            const isActive = activeTab === id

            return (
              <button
                key={id}
                type='button'
                role='tab'
                aria-selected={isActive}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-bold transition-colors ${
                  isActive
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {getTabIcon(id)}
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div key={activeTab} className='animate-rise'>
        {isLoading ? (
          <TabSkeleton />
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab
                artist={artist}
                processedData={processedData}
                bio={enrichment.enrichment?.bio}
                sources={enrichment.sources}
                dict={dict}
              />
            )}
            {activeTab === "discography" && (
              <DiscographyTab discography={processedData.discography} dict={dict} />
            )}
            {activeTab === "influences" && (
              <InfluencesTab influences={processedData.influences} dict={dict} />
            )}
            {activeTab === "collaborations" && (
              <CollaborationsTab
                collaborations={processedData.collaborations}
                dict={dict}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
