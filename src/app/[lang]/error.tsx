'use client'

import { useEffect } from 'react'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-6'>
      <div className='text-center max-w-md'>
        <div className='w-20 h-20 mx-auto mb-6 bg-coral-vibrant/10 rounded-full flex items-center justify-center'>
          <AlertTriangle className='w-10 h-10 text-coral-vibrant' />
        </div>
        <h2 className='text-2xl font-bold text-foreground mb-3'>
          Something went wrong
        </h2>
        <p className='text-muted mb-6 text-sm'>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className='flex gap-3 justify-center'>
          <button
            onClick={reset}
            className='px-6 py-2.5 bg-coral-vibrant text-white rounded-lg hover:bg-coral-vibrant/90 transition-colors inline-flex items-center gap-2 font-medium'
          >
            <RefreshCw className='w-4 h-4' />
            Try again
          </button>
          <Link
            href='/en'
            className='px-6 py-2.5 bg-surface border border-border text-foreground rounded-lg hover:bg-surface-elevated transition-colors inline-flex items-center gap-2 font-medium'
          >
            <ArrowLeft className='w-4 h-4' />
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
