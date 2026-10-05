import Link from 'next/link'
import { ArrowLeft, Music } from 'lucide-react'

export default function NotFound() {
  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-6'>
      <div className='text-center max-w-md'>
        <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-surface-elevated'>
          <Music className='h-10 w-10 text-coral-deep dark:text-coral-vibrant' />
        </div>
        <h2 className='mb-3 text-6xl font-bold text-coral-deep dark:text-coral-vibrant'>404</h2>
        <h3 className='mb-3 text-2xl font-bold text-foreground'>
          Page Not Found
        </h3>
        <p className='mb-6 text-muted-foreground'>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href='/en'
          className='inline-flex items-center gap-2 rounded-lg bg-coral-deep px-6 py-2.5 font-medium text-white transition-colors hover:bg-coral-deep/90'
        >
          <ArrowLeft className='w-4 h-4' />
          Go home
        </Link>
      </div>
    </div>
  )
}
