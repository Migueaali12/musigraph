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
  Tag,
  Users,
  ArrowLeft,
} from "lucide-react"
import { fetchDiscographyFromMusicBrainz } from "@/services/musicbrainzService"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface ArtistProfileProps {
  artist: ArtistInfo
  onBack: () => void
  endpoint: string
  dict: Dictionary
}

type TabType = "overview" | "discography" | "influences" | "collaborations"

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
    const loadData = async () => {
      setIsLoading(true)
      try {
        if (detailSource === "musicbrainz" && artist.mbid) {
          const mbDiscography = await fetchDiscographyFromMusicBrainz(
            artist.mbid
          )
          setDiscography(mbDiscography)
          setInfluences([])
          setCollaborations([])
        } else {
          const [discographyData, influencesData, collaborationsData] =
            await Promise.all([
              sparqlService.getArtistDiscography(
                artist.id,
                artist.mbid,
                endpoint
              ),
              sparqlService.getArtistInfluences(artist.id, endpoint),
              sparqlService.getCollaborations(artist.id, endpoint),
            ])
          setDiscography(discographyData)
          setInfluences(influencesData)
          setCollaborations(collaborationsData)
        }
      } catch (error) {
        console.error("Error loading artist data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [artist.id, artist.mbid, endpoint, detailSource])

  const processedData = dataProcessor.processArtistData(
    artist,
    discography,
    influences,
    collaborations
  )

  const canShowMusicBrainz = Boolean(artist.mbid)

  return (
    <div className='max-w-6xl mx-auto'>
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
      <div className='flex items-center gap-4 mb-8'>
        <button
          onClick={onBack}
          className='flex items-center gap-2 px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-surface-elevated transition-colors'
        >
          <ArrowLeft className='w-4 h-4' />
          {dict.artist.backToSearch}
        </button>
      </div>

      <div className='bg-surface border border-border rounded-3xl p-8 mb-8 shadow-sm'>
        <div className='flex flex-col lg:flex-row items-start gap-8'>
          <div className='flex-shrink-0'>
            <div className='relative w-48 h-48'>
              {artist.image && !imageError ? (
                <Image
                  src={artist.image}
                  alt={artist.name}
                  fill
                  className='rounded-2xl object-cover'
                  onError={() => setImageError(true)}
                  sizes='192px'
                  priority={false}
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
                    <span className='text-muted inline-flex items-center gap-1'><MapPin className="w-4 h-4" /> {dict.artist.country}</span>
                    <span className='text-foreground'>{artist.country}</span>
                  </div>
                )}

                {artist.birthDate && (
                  <div className='flex items-center gap-2'>
                    <span className='text-muted inline-flex items-center gap-1'><Calendar className="w-4 h-4" /> {dict.artist.year}</span>
                    <span className='text-foreground'>
                      {new Date(artist.birthDate).getFullYear()}
                    </span>
                  </div>
                )}

                {artist.instruments.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <span className='text-muted inline-flex items-center gap-1'><Music className="w-4 h-4" /> {dict.artist.instruments}</span>
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

              <div className='space-y-3'>
                {!isLoading && (
                  <>
                    <div className='flex items-center gap-2'>
                      <span className='text-muted inline-flex items-center gap-1'><Disc className="w-4 h-4" /> {dict.artist.albums}</span>
                      <span className='text-foreground font-semibold'>
                        {processedData.statistics.totalAlbums}
                      </span>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-muted inline-flex items-center gap-1'><Lightbulb className="w-4 h-4" /> {dict.artist.influences}</span>
                      <span className='text-foreground font-semibold'>
                        {processedData.statistics.totalInfluences}
                      </span>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-muted inline-flex items-center gap-1'><Handshake className="w-4 h-4" /> {dict.artist.collaborations}</span>
                      <span className='text-foreground font-semibold'>
                        {processedData.statistics.totalCollaborations}
                      </span>
                    </div>
                  </>
                )}
              </div>
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

      <div className='mb-8'>
        <div className='flex space-x-1 bg-surface border border-border rounded-2xl p-1'>
          {[
            { id: "overview", label: dict.artist.overview, icon: <BarChart3 className="w-4 h-4" /> },
            { id: "discography", label: dict.artist.discography, icon: <Disc className="w-4 h-4" /> },
            { id: "influences", label: dict.artist.influencesTab, icon: <Lightbulb className="w-4 h-4" /> },
            { id: "collaborations", label: dict.artist.collaborationsTab, icon: <Handshake className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1 ${
                activeTab === tab.id
                  ? "bg-coral-vibrant text-white shadow-lg"
                  : "text-muted hover:text-foreground hover:bg-surface-elevated"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className='bg-surface border border-border rounded-3xl p-8 shadow-sm'>
        {isLoading ? (
          <div className='text-center py-12'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-coral-vibrant mx-auto mb-4'></div>
            <p className='text-foreground'>{dict.artist.loadingInfo}</p>
          </div>
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

// ── Tab Components ──────────────────────────────────────────

function OverviewTab({
  artist,
  processedData,
  dict,
}: {
  artist: ArtistInfo
  processedData: ProcessedArtistData
  dict: Dictionary
}) {
  const countryPart = artist.country
    ? dict.artist.overviewDescriptionCountry.replace("{country}", artist.country)
    : ""
  const activePart = artist.birthDate
    ? dict.artist.overviewDescriptionActive.replace("{year}", String(new Date(artist.birthDate).getFullYear()))
    : ""
  const genresPart = artist.genres.length > 0
    ? dict.artist.overviewDescriptionGenres.replace("{genres}", artist.genres.slice(0, 3).join(", "))
    : ""

  return (
    <div className='space-y-8'>
      <div>
        <h3 className='text-2xl font-bold text-foreground mb-4'>{dict.artist.overviewTitle}</h3>
        <p className='text-muted text-lg leading-relaxed'>
          {dict.artist.overviewDescription
            .replace("{name}", artist.name)
            .replace("{country}", countryPart)
            .replace("{activeSince}", activePart)
            .replace("{genres}", genresPart)}
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='bg-gradient-energy rounded-2xl p-6 text-center'>
          <div className='text-3xl font-bold text-white mb-2'>
            {processedData.statistics.totalAlbums}
          </div>
          <div className='text-white/80'>{dict.artist.statAlbums}</div>
        </div>
        <div className='bg-gradient-ocean rounded-2xl p-6 text-center'>
          <div className='text-3xl font-bold text-white mb-2'>
            {processedData.statistics.totalInfluences}
          </div>
          <div className='text-white/80'>{dict.artist.statInfluences}</div>
        </div>
        <div className='bg-gradient-sunrise rounded-2xl p-6 text-center'>
          <div className='text-3xl font-bold text-white mb-2'>
            {processedData.statistics.totalCollaborations}
          </div>
          <div className='text-white/80'>{dict.artist.statCollaborations}</div>
        </div>
      </div>
    </div>
  )
}

function DiscographyTab({ discography, dict }: { discography: AlbumInfo[], dict: Dictionary }) {
  if (discography.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 mx-auto mb-4 bg-surface-elevated rounded-full flex items-center justify-center'>
          <Disc className='w-8 h-8 text-muted' />
        </div>
        <h4 className='text-lg font-semibold text-foreground mb-2'>
          {dict.artist.noDiscography}
        </h4>
        <p className='text-muted'>
          {dict.artist.noDiscographyDesc}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className='text-2xl font-bold text-foreground mb-6'>{dict.artist.discography}</h3>
      <div className='space-y-4'>
        {discography.map((album, index) => (
          <div
            key={index}
            className='flex items-center gap-4 p-4 bg-surface-elevated border border-border rounded-xl hover:border-border/60 transition-colors'
          >
            <div className='w-12 h-12 bg-gradient-ocean rounded-lg flex items-center justify-center flex-shrink-0'>
              <Disc className='w-6 h-6 text-white' />
            </div>
            <div className='flex-1 min-w-0'>
              <h4 className='font-semibold text-foreground'>{album.title}</h4>
              <div className='flex items-center gap-4 text-sm text-muted'>
                {album.releaseDate && (
                  <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(album.releaseDate).getFullYear()}</span>
                )}
                {album.label && <span className="inline-flex items-center gap-1"><Tag className="w-4 h-4" /> {album.label}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InfluencesTab({ influences, dict }: { influences: ArtistInfo[], dict: Dictionary }) {
  if (influences.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 mx-auto mb-4 bg-surface-elevated rounded-full flex items-center justify-center'>
          <Lightbulb className='w-8 h-8 text-muted' />
        </div>
        <h4 className='text-lg font-semibold text-foreground mb-2'>
          {dict.artist.noInfluences}
        </h4>
        <p className='text-muted'>
          {dict.artist.noInfluencesDesc}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className='text-2xl font-bold text-foreground mb-6'>
        {dict.artist.influencesTab}
      </h3>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {influences.map((influence, index) => (
          <div
            key={index}
            className='p-4 bg-surface-elevated border border-border rounded-xl hover:border-border/60 transition-colors'
          >
            <h4 className='font-semibold text-foreground mb-2'>{influence.name}</h4>
            {influence.country && (
              <p className='text-sm text-muted mb-2 inline-flex items-center gap-1'>
                <MapPin className="w-4 h-4" /> {influence.country}
              </p>
            )}
            {influence.genres.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {influence.genres.slice(0, 3).map((genre, genreIndex) => (
                  <span
                    key={genreIndex}
                    className='px-2 py-1 bg-turquoise-musical/15 text-turquoise-musical text-xs rounded-full font-medium'
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CollaborationsTab({
  collaborations,
  dict,
}: {
  collaborations: CollaborationInfo[]
  dict: Dictionary
}) {
  if (collaborations.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 mx-auto mb-4 bg-surface-elevated rounded-full flex items-center justify-center'>
          <Users className='w-8 h-8 text-muted' />
        </div>
        <h4 className='text-lg font-semibold text-foreground mb-2'>
          {dict.artist.noCollaborations}
        </h4>
        <p className='text-muted'>
          {dict.artist.noCollaborationsDesc}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className='text-2xl font-bold text-foreground mb-6'>{dict.artist.collaborationsTab}</h3>
      <div className='space-y-4'>
        {collaborations.map((collab, index) => (
          <div
            key={index}
            className='p-4 bg-surface-elevated border border-border rounded-xl hover:border-border/60 transition-colors'
          >
            <h4 className='font-semibold text-foreground mb-2'>{collab.song}</h4>
            <div className='flex items-center gap-4 text-sm text-muted'>
              <span className="inline-flex items-center gap-1"><Users className="w-4 h-4" /> {dict.artist.with.replace("{artist}", collab.artist2)}</span>
              {collab.releaseDate && (
                <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(collab.releaseDate).getFullYear()}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
