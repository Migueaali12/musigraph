"use client"

import { useState, useEffect } from "react"
import {
  type ArtistInfo,
  type AlbumInfo,
  type CollaborationInfo,
  sparqlService,
} from "@/services/sparqlService"
import {
  dataProcessor,
  type ProcessedArtistData,
} from "@/services/dataProcessor"
import Image from "next/image"
import {
  MapPin,
  Calendar,
  Music,
  Disc,
  Lightbulb,
  Handshake,
  BarChart3,
  ArrowLeft,
} from "lucide-react"
import { fetchDiscographyFromMusicBrainz } from "@/services/musicbrainzService"
import type { Dictionary } from "@/dictionaries/getDictionary"
import { OverviewTab } from "./tabs/OverviewTab"
import { DiscographyTab } from "./tabs/DiscographyTab"
import { InfluencesTab } from "./tabs/InfluencesTab"
import { CollaborationsTab } from "./tabs/CollaborationsTab"

// ── Static config hoisted outside component (no recreation on render) ──────

type TabType = "overview" | "discography" | "influences" | "collaborations"

const TAB_IDS: TabType[] = ["overview", "discography", "influences", "collaborations"]

function getTabIcon(id: TabType, className = "w-4 h-4") {
  switch (id) {
    case "overview": return <BarChart3 className={className} />
    case "discography": return <Disc className={className} />
    case "influences": return <Lightbulb className={className} />
    case "collaborations": return <Handshake className={className} />
  }
}

// ── Skeleton loader ────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className='space-y-4 animate-pulse'>
      <div className='h-6 bg-surface-elevated rounded w-48' />
      {[1, 2, 3].map((i) => (
        <div key={i} className='flex items-center gap-4 p-4 bg-surface-elevated rounded-xl'>
          <div className='w-12 h-12 bg-border rounded-lg shrink-0' />
          <div className='flex-1 space-y-2'>
            <div className='h-4 bg-border rounded w-3/4' />
            <div className='h-3 bg-border rounded w-1/2' />
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
  endpoint: string
  dict: Dictionary
}

export function ArtistProfile({
  artist,
  onBack,
  endpoint,
  dict,
}: ArtistProfileProps) {
  const [discography, setDiscography] = useState<AlbumInfo[]>([])
  const [influences, setInfluences] = useState<ArtistInfo[]>([])
  const [collaborations, setCollaborations] = useState<CollaborationInfo[]>([])
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
        if (detailSource === "musicbrainz" && artist.mbid) {
          const mbDiscography = await fetchDiscographyFromMusicBrainz(artist.mbid)
          if (!cancelled) {
            setDiscography(mbDiscography)
            setInfluences([])
            setCollaborations([])
          }
        } else {
          const [discographyData, influencesData, collaborationsData] =
            await Promise.all([
              sparqlService.getArtistDiscography(artist.id, artist.mbid, endpoint),
              sparqlService.getArtistInfluences(artist.id, endpoint),
              sparqlService.getCollaborations(artist.id, endpoint),
            ])
          if (!cancelled) {
            setDiscography(discographyData)
            setInfluences(influencesData)
            setCollaborations(collaborationsData)
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
  }, [artist.id, artist.mbid, endpoint, detailSource])

  const processedData: ProcessedArtistData = dataProcessor.processArtistData(
    artist,
    discography,
    influences,
    collaborations
  )

  const canShowMusicBrainz = Boolean(artist.mbid)

  return (
    <div className='max-w-6xl mx-auto'>
      {/* Source selector */}
      <div className='flex justify-end mb-4'>
        <div className='flex items-center gap-2'>
          <span className='text-muted text-sm'>{dict.artist.dataSource}</span>
          <select
            value={detailSource}
            onChange={(e) =>
              setDetailSource(e.target.value as "endpoint" | "musicbrainz")
            }
            className='bg-surface border border-border text-foreground rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
            disabled={!canShowMusicBrainz}
          >
            <option value='endpoint'>
              {endpoint.includes("dbpedia") ? "DBpedia" : "Wikidata"}
            </option>
            {canShowMusicBrainz && (
              <option value='musicbrainz'>MusicBrainz</option>
            )}
          </select>
        </div>
      </div>

      {/* Back button */}
      <div className='flex items-center gap-4 mb-8'>
        <button
          onClick={onBack}
          className='flex items-center gap-2 px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-surface-elevated transition-colors'
        >
          <ArrowLeft className='w-4 h-4' />
          {dict.artist.backToSearch}
        </button>
      </div>

      {/* Artist hero card */}
      <div className='bg-surface border border-border rounded-3xl p-8 mb-8 shadow-sm'>
        <div className='flex flex-col lg:flex-row items-start gap-8'>
          <div className='shrink-0'>
            <div className='relative w-48 h-48'>
              {artist.image && !imageError ? (
                <Image
                  src={artist.image}
                  alt={artist.name}
                  fill
                  className='rounded-2xl object-cover'
                  onError={() => setImageError(true)}
                  sizes='192px'
                  priority
                />
              ) : (
                <div className='w-full h-full bg-gradient-energy rounded-2xl flex items-center justify-center'>
                  <Music className='w-16 h-16 text-white' />
                </div>
              )}
            </div>
          </div>

          <div className='flex-1'>
            <h1 className='text-4xl font-bold text-foreground mb-4'>
              {artist.name}
            </h1>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
              <div className='space-y-3'>
                {artist.country && (
                  <div className='flex items-center gap-2'>
                    <span className='text-muted inline-flex items-center gap-1'>
                      <MapPin className='w-4 h-4' /> {dict.artist.country}
                    </span>
                    <span className='text-foreground'>{artist.country}</span>
                  </div>
                )}

                {artist.birthDate && (
                  <div className='flex items-center gap-2'>
                    <span className='text-muted inline-flex items-center gap-1'>
                      <Calendar className='w-4 h-4' /> {dict.artist.year}
                    </span>
                    <span className='text-foreground'>
                      {new Date(artist.birthDate).getFullYear()}
                    </span>
                  </div>
                )}

                {artist.instruments.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <span className='text-muted inline-flex items-center gap-1'>
                      <Music className='w-4 h-4' /> {dict.artist.instruments}
                    </span>
                    <div className='flex flex-wrap gap-1'>
                      {artist.instruments.map((instrument, index) => (
                        <span
                          key={index}
                          className='px-2 py-1 bg-blue-harmonic/15 text-blue-harmonic text-xs rounded-full font-medium'
                        >
                          {instrument}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!isLoading && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-muted inline-flex items-center gap-1'>
                      <Disc className='w-4 h-4' /> {dict.artist.albums}
                    </span>
                    <span className='text-foreground font-semibold'>
                      {processedData.statistics.totalAlbums}
                    </span>
                  </div>

                  <div className='flex items-center gap-2'>
                    <span className='text-muted inline-flex items-center gap-1'>
                      <Lightbulb className='w-4 h-4' /> {dict.artist.influences}
                    </span>
                    <span className='text-foreground font-semibold'>
                      {processedData.statistics.totalInfluences}
                    </span>
                  </div>

                  <div className='flex items-center gap-2'>
                    <span className='text-muted inline-flex items-center gap-1'>
                      <Handshake className='w-4 h-4' /> {dict.artist.collaborations}
                    </span>
                    <span className='text-foreground font-semibold'>
                      {processedData.statistics.totalCollaborations}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {artist.genres.length > 0 && (
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-foreground mb-3'>
                  {dict.artist.musicalGenres}
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {artist.genres.map((genre, index) => (
                    <span
                      key={index}
                      className='px-3 py-1 bg-coral-vibrant/15 text-coral-vibrant rounded-full font-medium'
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className='mb-8'>
        <div className='flex space-x-1 bg-surface border border-border rounded-2xl p-1'>
          {TAB_IDS.map((id) => {
            const label =
              id === "overview"
                ? dict.artist.overview
                : id === "discography"
                  ? dict.artist.discography
                  : id === "influences"
                    ? dict.artist.influencesTab
                    : dict.artist.collaborationsTab

            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1 ${
                  activeTab === id
                    ? "bg-coral-vibrant text-white shadow-lg"
                    : "text-muted hover:text-foreground hover:bg-surface-elevated"
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
      <div className='bg-surface border border-border rounded-3xl p-8 shadow-sm'>
        {isLoading ? (
          <TabSkeleton />
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab artist={artist} processedData={processedData} dict={dict} />
            )}
            {activeTab === "discography" && (
              <DiscographyTab discography={discography} dict={dict} />
            )}
            {activeTab === "influences" && (
              <InfluencesTab influences={influences} dict={dict} />
            )}
            {activeTab === "collaborations" && (
              <CollaborationsTab collaborations={collaborations} dict={dict} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
