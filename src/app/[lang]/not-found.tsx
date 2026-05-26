import Link from 'next/link'
import { ArrowLeft, Music } from 'lucide-react'

export default function NotFound() {
  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-6'>
      <div className='text-center max-w-md'>
        <div className='w-20 h-20 mx-auto mb-6 bg-gradient-energy rounded-full flex items-center justify-center'>
          <Music className='w-10 h-10 text-white' />
        </div>
        <h2 className='text-6xl font-bold text-coral-vibrant mb-3'>404</h2>
        <h3 className='text-2xl font-bold text-foreground mb-3'>
          Page Not Found
        </h3>
        <p className='text-muted mb-6'>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href='/en'
          className='px-6 py-2.5 bg-coral-vibrant text-white rounded-lg hover:bg-coral-vibrant/90 transition-colors inline-flex items-center gap-2 font-medium'
        >
          <ArrowLeft className='w-4 h-4' />
          Go home
        </Link>
      </div>
    </div>
  )
}
