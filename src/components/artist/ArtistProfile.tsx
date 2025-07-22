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
import { fetchDiscographyFromMusicBrainz } from "@/services/musicbrainzService"

interface ArtistProfileProps {
  artist: ArtistInfo
  onBack: () => void
  endpoint: string
}

type TabType = "overview" | "discography" | "influences" | "collaborations"

export function ArtistProfile({
  artist,
  onBack,
  endpoint,
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
          // Solo discografía desde MusicBrainz
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

  // Selector de fuente de datos
  const canShowMusicBrainz = Boolean(artist.mbid)

  return (
    <div className='max-w-6xl mx-auto'>
      {/* Selector de fuente de datos */}
      <div className='flex justify-end mb-4'>
        <div className='flex items-center gap-2'>
          <span className='text-gray-400 text-sm'>Fuente de datos:</span>
          <select
            value={detailSource}
            onChange={(e) =>
              setDetailSource(e.target.value as "endpoint" | "musicbrainz")
            }
            className='bg-white/10 text-white rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
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
      {/* Header con botón de regreso */}
      <div className='flex items-center gap-4 mb-8'>
        <button
          onClick={onBack}
          className='flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors'
        >
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 19l-7-7 7-7'
            />
          </svg>
          Volver a búsqueda
        </button>
      </div>

      {/* Información principal del artista */}
      <div className='bg-white/5 backdrop-blur-sm rounded-3xl p-8 mb-8 border border-white/10'>
        <div className='flex flex-col lg:flex-row items-start gap-8'>
          {/* Imagen del artista */}
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
                  <svg
                    className='w-16 h-16 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Información básica */}
          <div className='flex-1'>
            <h1 className='text-4xl font-bold text-white mb-4'>
              {artist.name}
            </h1>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
              {/* Detalles básicos */}
              <div className='space-y-3'>
                {artist.country && (
                  <div className='flex items-center gap-2'>
                    <span className='text-gray-400'>📍 País:</span>
                    <span className='text-white'>{artist.country}</span>
                  </div>
                )}

                {artist.birthDate && (
                  <div className='flex items-center gap-2'>
                    <span className='text-gray-400'>📅 Año:</span>
                    <span className='text-white'>
                      {new Date(artist.birthDate).getFullYear()}
                    </span>
                  </div>
                )}

                {artist.instruments.length > 0 && (
                  <div className='flex items-start gap-2'>
                    <span className='text-gray-400'>🎵 Instrumentos:</span>
                    <div className='flex flex-wrap gap-1'>
                      {artist.instruments.map((instrument, index) => (
                        <span
                          key={index}
                          className='px-2 py-1 bg-blue-harmonic/20 text-blue-harmonic text-xs rounded-full'
                        >
                          {instrument}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Estadísticas */}
              <div className='space-y-3'>
                {!isLoading && (
                  <>
                    <div className='flex items-center gap-2'>
                      <span className='text-gray-400'>💿 Álbumes:</span>
                      <span className='text-white font-semibold'>
                        {processedData.statistics.totalAlbums}
                      </span>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-gray-400'>🎭 Influencias:</span>
                      <span className='text-white font-semibold'>
                        {processedData.statistics.totalInfluences}
                      </span>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-gray-400'>🤝 Colaboraciones:</span>
                      <span className='text-white font-semibold'>
                        {processedData.statistics.totalCollaborations}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Géneros */}
            {artist.genres.length > 0 && (
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-white mb-3'>
                  Géneros Musicales
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {artist.genres.map((genre, index) => (
                    <span
                      key={index}
                      className='px-3 py-1 bg-coral-vibrant/20 text-coral-vibrant rounded-full'
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

      {/* Tabs de navegación */}
      <div className='mb-8'>
        <div className='flex space-x-1 bg-white/5 backdrop-blur-sm rounded-2xl p-1'>
          {[
            { id: "overview", label: "Resumen", icon: "📊" },
            { id: "discography", label: "Discografía", icon: "💿" },
            { id: "influences", label: "Influencias", icon: "🎭" },
            { id: "collaborations", label: "Colaboraciones", icon: "🤝" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-coral-vibrant text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className='mr-2'>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de las tabs */}
      <div className='bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10'>
        {isLoading ? (
          <div className='text-center py-12'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-coral-vibrant mx-auto mb-4'></div>
            <p className='text-white'>Cargando información del artista...</p>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab artist={artist} processedData={processedData} />
            )}
            {activeTab === "discography" && (
              <DiscographyTab discography={discography} />
            )}
            {activeTab === "influences" && (
              <InfluencesTab influences={influences} />
            )}
            {activeTab === "collaborations" && (
              <CollaborationsTab collaborations={collaborations} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Componentes de las tabs
function OverviewTab({
  artist,
  processedData,
}: {
  artist: ArtistInfo
  processedData: ProcessedArtistData
}) {
  return (
    <div className='space-y-8'>
      <div>
        <h3 className='text-2xl font-bold text-white mb-4'>Resumen General</h3>
        <p className='text-gray-300 text-lg leading-relaxed'>
          Explora la carrera musical de <strong>{artist.name}</strong>,
          {artist.country && ` originario de ${artist.country},`}
          {artist.birthDate &&
            ` activo desde ${new Date(artist.birthDate).getFullYear()}.`}
          {artist.genres.length > 0 &&
            ` Conocido principalmente por su trabajo en ${artist.genres
              .slice(0, 3)
              .join(", ")}.`}
        </p>
      </div>

      {/* Estadísticas visuales */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='bg-gradient-energy rounded-2xl p-6 text-center'>
          <div className='text-3xl font-bold text-white mb-2'>
            {processedData.statistics.totalAlbums}
          </div>
          <div className='text-white/80'>Álbumes</div>
        </div>
        <div className='bg-gradient-ocean rounded-2xl p-6 text-center'>
          <div className='text-3xl font-bold text-white mb-2'>
            {processedData.statistics.totalInfluences}
          </div>
          <div className='text-white/80'>Influencias</div>
        </div>
        <div className='bg-gradient-sunrise rounded-2xl p-6 text-center'>
          <div className='text-3xl font-bold text-white mb-2'>
            {processedData.statistics.totalCollaborations}
          </div>
          <div className='text-white/80'>Colaboraciones</div>
        </div>
      </div>
    </div>
  )
}

function DiscographyTab({ discography }: { discography: AlbumInfo[] }) {
  if (discography.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center'>
          <svg
            className='w-8 h-8 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <circle cx='12' cy='12' r='10' />
            <circle cx='12' cy='12' r='3' />
          </svg>
        </div>
        <h4 className='text-lg font-semibold text-white mb-2'>
          Sin discografía disponible
        </h4>
        <p className='text-gray-400'>
          No encontramos álbumes registrados para este artista en Wikidata.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className='text-2xl font-bold text-white mb-6'>Discografía</h3>
      <div className='space-y-4'>
        {discography.map((album, index) => (
          <div
            key={index}
            className='flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors'
          >
            <div className='w-12 h-12 bg-gradient-ocean rounded-lg flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <circle cx='12' cy='12' r='10' />
                <circle cx='12' cy='12' r='3' />
              </svg>
            </div>
            <div className='flex-1'>
              <h4 className='font-semibold text-white'>{album.title}</h4>
              <div className='flex items-center gap-4 text-sm text-gray-400'>
                {album.releaseDate && (
                  <span>📅 {new Date(album.releaseDate).getFullYear()}</span>
                )}
                {album.label && <span>🏷️ {album.label}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InfluencesTab({ influences }: { influences: ArtistInfo[] }) {
  if (influences.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center'>
          <svg
            className='w-8 h-8 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
            />
          </svg>
        </div>
        <h4 className='text-lg font-semibold text-white mb-2'>
          Sin influencias registradas
        </h4>
        <p className='text-gray-400'>
          No encontramos información sobre las influencias de este artista en
          Wikidata.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className='text-2xl font-bold text-white mb-6'>
        Influencias Musicales
      </h3>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {influences.map((influence, index) => (
          <div
            key={index}
            className='p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors'
          >
            <h4 className='font-semibold text-white mb-2'>{influence.name}</h4>
            {influence.country && (
              <p className='text-sm text-gray-400 mb-2'>
                📍 {influence.country}
              </p>
            )}
            {influence.genres.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {influence.genres.slice(0, 3).map((genre, genreIndex) => (
                  <span
                    key={genreIndex}
                    className='px-2 py-1 bg-turquoise-musical/20 text-turquoise-musical text-xs rounded-full'
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
}: {
  collaborations: CollaborationInfo[]
}) {
  if (collaborations.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center'>
          <svg
            className='w-8 h-8 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
            />
          </svg>
        </div>
        <h4 className='text-lg font-semibold text-white mb-2'>
          Sin colaboraciones registradas
        </h4>
        <p className='text-gray-400'>
          No encontramos colaboraciones registradas para este artista en
          Wikidata.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className='text-2xl font-bold text-white mb-6'>Colaboraciones</h3>
      <div className='space-y-4'>
        {collaborations.map((collab, index) => (
          <div
            key={index}
            className='p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors'
          >
            <h4 className='font-semibold text-white mb-2'>{collab.song}</h4>
            <div className='flex items-center gap-4 text-sm text-gray-400'>
              <span>👥 Con {collab.artist2}</span>
              {collab.releaseDate && (
                <span>📅 {new Date(collab.releaseDate).getFullYear()}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
