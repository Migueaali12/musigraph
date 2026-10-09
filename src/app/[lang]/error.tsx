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
    <div className='flex min-h-screen items-center justify-center p-6'>
      <div className='max-w-md text-center'>
        <AlertTriangle className='mx-auto mb-4 h-5 w-5 text-accent' strokeWidth={1.5} aria-hidden='true' />
        <h2 className='mb-2 text-xl font-bold'>
          Something went wrong
        </h2>
        <p className='mb-6 text-[13px] leading-relaxed text-muted'>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className='flex justify-center gap-3'>
          <button onClick={reset} className='btn btn-primary'>
            <RefreshCw className='h-3.5 w-3.5' strokeWidth={1.5} aria-hidden='true' />
            Try again
          </button>
          <Link href='/en' className='control'>
            <ArrowLeft className='h-3.5 w-3.5' strokeWidth={1.5} aria-hidden='true' />
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
