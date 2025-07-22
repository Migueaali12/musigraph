"use client"

import { useState } from "react"
import Link from "next/link"
import { sparqlService } from "@/services/sparqlService"
import { queryBuilder } from "@/services/queryBuilder"
import { dataProcessor } from "@/services/dataProcessor"
import { Loading } from "@/components/common/Loading"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import {
  fetchDiscographyFromMusicBrainz,
  fetchCollaborationsFromMusicBrainz,
  fetchInfluencesFromMusicBrainz,
  fetchDeepCollaborationsFromMusicBrainz,
  fetchDeepInfluencesFromMusicBrainz,
} from "@/services/musicbrainzService"

interface TestResult {
  type: string
  data: unknown
  error?: string
  duration: number
}

export default function TestPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("Beatles")

  const runTest = async (
    testName: string,
    testFunction: () => Promise<unknown>
  ) => {
    const startTime = Date.now()
    setIsLoading(true)
    try {
      console.log(`🧪 Ejecutando: ${testName}`)
      const data = await testFunction()
      const duration = Date.now() - startTime
      console.log(`✅ ${testName} completado en ${duration}ms`, data)
      setResults((prev) => [...prev, { type: testName, data, duration }])
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Error en ${testName}:`, error)
      setResults((prev) => [
        ...prev,
        {
          type: testName,
          data: null,
          error: error instanceof Error ? error.message : "Error desconocido",
          duration,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const runAllTests = async () => {
    setIsLoading(true)
    setResults([])

    // Test de conectividad básica
    await runTest("Test de Conectividad", () => sparqlService.testConnection())

    // Test simple con consulta conocida
    await runTest("Consulta Simple", () => sparqlService.testSimpleQuery())

    // Test con artistas conocidos
    await runTest("Buscar Beatles (ID conocido)", () =>
      sparqlService.searchBeatles()
    )

    // Test con lista de artistas famosos
    await runTest("Top Bands (IDs conocidos)", () =>
      sparqlService.getTopBands()
    )

    // Test 1: Búsqueda flexible de artista
    await runTest("Búsqueda Flexible de Artista", () =>
      sparqlService.searchArtistFlexible(searchTerm)
    )

    // Test 2: Búsqueda exacta de artista
    await runTest("Búsqueda Exacta de Artista", () =>
      sparqlService.searchArtist(searchTerm)
    )

    // Test 3: Artistas populares (sin filtros)
    await runTest("Artistas Populares", () => sparqlService.getPopularArtists())

    // Test 4: Búsqueda por género (Rock)
    await runTest(
      "Artistas por Género (Rock)",
      () => sparqlService.searchByGenre("Q11399") // Rock
    )

    // Test 5: Construcción de consulta dinámica
    await runTest("Consulta Dinámica", async () => {
      const query = queryBuilder.buildArtistSearchQuery(
        { name: searchTerm, genre: "Q11399" },
        { limit: 5 }
      )
      // Ejecutar la consulta construida
      const response = await sparqlService.query(query)
      return { query, response }
    })

    // Test 6: Procesamiento de datos (usando artistas populares)
    await runTest("Procesamiento de Datos", async () => {
      const artists = await sparqlService.getPopularArtists()
      if (artists.length > 0) {
        const artist = artists[0]
        const discography = await sparqlService.getArtistDiscography(artist.id)
        const influences = await sparqlService.getArtistInfluences(artist.id)
        const collaborations = await sparqlService.getCollaborations(artist.id)

        return dataProcessor.processArtistData(
          artist,
          discography,
          influences,
          collaborations
        )
      }
      return null
    })

    // Test 7: Red de influencias
    await runTest("Red de Influencias", async () => {
      const artists = await sparqlService.getPopularArtists()
      if (artists.length > 0) {
        const influences = await sparqlService.getArtistInfluences(
          artists[0].id
        )
        return dataProcessor.buildInfluenceNetwork(artists[0], influences)
      }
      return null
    })

    // Test 8: Timeline de géneros
    await runTest("Timeline de Géneros", async () => {
      const artists = await sparqlService.getPopularArtists()
      if (artists.length > 0) {
        const discography = await sparqlService.getArtistDiscography(
          artists[0].id
        )
        return dataProcessor.buildGenreTimeline(discography)
      }
      return null
    })

    // Test 9: Distribución geográfica
    await runTest("Distribución Geográfica", async () => {
      const artists = await sparqlService.searchByGenre("Q11399")
      return dataProcessor.processGeographicData(artists)
    })

    // Test 10: Análisis de géneros
    await runTest("Análisis de Géneros", async () => {
      const artists = await sparqlService.searchByGenre("Q11399")
      return dataProcessor.extractGenres(artists)
    })

    // Test 11: Búsqueda por Jazz
    await runTest(
      "Artistas por Género (Jazz)",
      () => sparqlService.searchByGenre("Q8341") // Jazz
    )

    // Test 12: Búsqueda por Pop
    await runTest(
      "Artistas por Género (Pop)",
      () => sparqlService.searchByGenre("Q37073") // Pop
    )

    // Test 6: Fetch de datos desde MusicBrainz usando MBID de ejemplo
    await runTest(
      "MusicBrainz Artist Data (MBID: 5b11f4ce-a62d-471e-81fc-a69a8278c7da)",
      async () => {
        // MBID de Nirvana: 5b11f4ce-a62d-471e-81fc-a69a8278c7da
        const mbid = "5b11f4ce-a62d-471e-81fc-a69a8278c7da"
        const res = await fetch(
          `https://musicbrainz.org/ws/2/artist/${mbid}?inc=releases+release-groups+recordings&fmt=json`,
          {
            headers: {
              "User-Agent": "MusiGraphTest/1.0 (https://musigraph.app)",
              Accept: "application/json",
            },
          }
        )
        if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`)
        const data = await res.json()
        return data
      }
    )

    // Test 7: Discografía desde MusicBrainz helper
    await runTest("MusicBrainz Discografía Helper", async () => {
      const mbid = "5b11f4ce-a62d-471e-81fc-a69a8278c7da"
      return await fetchDiscographyFromMusicBrainz(mbid)
    })

    // Test 8: Colaboraciones desde MusicBrainz helper
    await runTest("MusicBrainz Colaboraciones Helper", async () => {
      const mbid = "5b11f4ce-a62d-471e-81fc-a69a8278c7da"
      return await fetchCollaborationsFromMusicBrainz(mbid)
    })

    // Test 9: Influencias desde MusicBrainz helper
    await runTest("MusicBrainz Influencias Helper", async () => {
      const mbid = "5b11f4ce-a62d-471e-81fc-a69a8278c7da"
      return await fetchInfluencesFromMusicBrainz(mbid)
    })

    // Test 10: Colaboraciones profundas desde MusicBrainz (releases)
    await runTest("MusicBrainz Deep Colaboraciones Helper", async () => {
      const mbid = "5b11f4ce-a62d-471e-81fc-a69a8278c7da"
      return await fetchDeepCollaborationsFromMusicBrainz(mbid, 3)
    })

    // Test 11: Influencias profundas desde MusicBrainz (releases)
    await runTest("MusicBrainz Deep Influencias Helper", async () => {
      const mbid = "5b11f4ce-a62d-471e-81fc-a69a8278c7da"
      return await fetchDeepInfluencesFromMusicBrainz(mbid, 3)
    })

    setIsLoading(false)
  }

  const clearResults = () => {
    setResults([])
  }

  const clearCacheAndResults = () => {
    sparqlService.clearCache()
    setResults([])
    console.log("🗑️ Cache limpiado")
  }

  const testSpecificArtist = async () => {
    setIsLoading(true)
    setResults([])

    // Probar con diferentes variaciones del nombre
    const testNames = [
      "Beatles",
      "The Beatles",
      "John Lennon",
      "Bob Dylan",
      "Elvis Presley",
    ]

    for (const name of testNames) {
      await runTest(`Búsqueda: "${name}"`, () =>
        sparqlService.searchArtistFlexible(name)
      )
    }

    setIsLoading(false)
  }

  const quickConnectivityTest = async () => {
    setIsLoading(true)
    setResults([])

    // Solo tests básicos de conectividad
    await runTest("🔌 Test de Conectividad", () =>
      sparqlService.testConnection()
    )

    await runTest("📊 Consulta Simple", () => sparqlService.testSimpleQuery())

    await runTest("🎵 Beatles (ID Conocido)", () =>
      sparqlService.searchBeatles()
    )

    setIsLoading(false)
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-deep-night via-acoustic-gray to-deep-night p-8'>
      <div className='max-w-6xl mx-auto'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-white mb-4'>
            Prueba de Servicios Backend
          </h1>
          <p className='text-gray-300 mb-4'>
            Verificación de los servicios SPARQL y procesamiento de datos
          </p>

          {/* Navegación */}
          <div className='flex justify-center gap-4'>
            <Link
              href='/'
              className='px-4 py-2 bg-coral-vibrant text-white rounded-lg hover:bg-coral-vibrant/80 transition-colors'
            >
              ← Ir a la App Principal
            </Link>
            <span className='px-4 py-2 bg-white/10 text-white rounded-lg'>
              Página de Tests
            </span>
          </div>
        </div>

        {/* Controles */}
        <div className='bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8'>
          <div className='flex flex-col md:flex-row gap-4 items-center'>
            <div className='flex-1'>
              <label className='block text-white text-sm font-medium mb-2'>
                Término de Búsqueda
              </label>
              <input
                type='text'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral-vibrant'
                placeholder='Ej: Beatles, Lennon, Dylan...'
              />
            </div>
            <div className='flex gap-2'>
              <button
                onClick={quickConnectivityTest}
                disabled={isLoading}
                className='bg-gradient-sunrise text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50'
              >
                {isLoading ? "Conectando..." : "Test Rápido"}
              </button>
              <button
                onClick={runAllTests}
                disabled={isLoading}
                className='bg-gradient-energy text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50'
              >
                {isLoading ? "Ejecutando..." : "Ejecutar Pruebas"}
              </button>
              <button
                onClick={testSpecificArtist}
                disabled={isLoading}
                className='bg-gradient-ocean text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50'
              >
                Probar Artistas
              </button>
              <button
                onClick={clearResults}
                className='bg-acoustic-gray text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-80 transition-colors'
              >
                Limpiar
              </button>
              <button
                onClick={clearCacheAndResults}
                className='bg-red-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors'
                title='Limpiar cache y resultados'
              >
                🗑️ Cache
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className='text-center mb-8'>
            <Loading message='Ejecutando pruebas de servicios...' size='lg' />
          </div>
        )}

        {/* Resultados */}
        <ErrorBoundary>
          <div className='space-y-6'>
            {results.map((result, index) => (
              <div
                key={index}
                className='bg-white/10 backdrop-blur-sm rounded-2xl p-6'
              >
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-xl font-semibold text-white'>
                    {result.type}
                  </h3>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm text-gray-400'>
                      {result.duration}ms
                    </span>
                    {result.error ? (
                      <span className='text-red-400 text-sm'>❌ Error</span>
                    ) : (
                      <span className='text-green-400 text-sm'>✅ Exitoso</span>
                    )}
                  </div>
                </div>

                {result.error ? (
                  <div className='bg-red-500/20 border border-red-500/30 rounded-lg p-4'>
                    <p className='text-red-300 font-medium'>Error:</p>
                    <p className='text-red-200'>{result.error}</p>
                  </div>
                ) : (
                  <div className='bg-white/5 rounded-lg p-4'>
                    <pre className='text-sm text-gray-300 overflow-x-auto'>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ErrorBoundary>

        {/* Estadísticas */}
        {results.length > 0 && (
          <div className='mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6'>
            <h3 className='text-xl font-semibold text-white mb-4'>
              Estadísticas
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-coral-vibrant'>
                  {results.length}
                </div>
                <div className='text-gray-400'>Pruebas Ejecutadas</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-turquoise-musical'>
                  {results.filter((r) => !r.error).length}
                </div>
                <div className='text-gray-400'>Exitosas</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-blue-harmonic'>
                  {Math.round(
                    results.reduce((acc, r) => acc + r.duration, 0) /
                      results.length
                  )}
                  ms
                </div>
                <div className='text-gray-400'>Tiempo Promedio</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-green-melodic'>
                  {
                    results.filter(
                      (r) =>
                        r.data && Array.isArray(r.data) && r.data.length > 0
                    ).length
                  }
                </div>
                <div className='text-gray-400'>Con Datos</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
