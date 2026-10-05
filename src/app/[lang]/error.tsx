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
        <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-coral-vibrant/10'>
          <AlertTriangle className='h-10 w-10 text-coral-deep dark:text-coral-vibrant' />
        </div>
        <h2 className='mb-3 text-2xl font-bold text-foreground'>
          Something went wrong
        </h2>
        <p className='mb-6 text-sm text-muted-foreground'>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className='flex justify-center gap-3'>
          <button
            onClick={reset}
            className='inline-flex items-center gap-2 rounded-lg bg-coral-deep px-6 py-2.5 font-medium text-white transition-colors hover:bg-coral-deep/90'
          >
            <RefreshCw className='h-4 w-4' />
            Try again
          </button>
          <Link
            href='/en'
            className='inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-2.5 font-medium text-foreground transition-colors hover:bg-surface-elevated'
          >
            <ArrowLeft className='w-4 h-4' />
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
