import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center p-6'>
      <div className='max-w-md text-center'>
        <p className='mb-2 text-5xl font-bold tracking-tight text-accent'>404</p>
        <h3 className='mb-2 text-xl font-bold'>
          Page Not Found
        </h3>
        <p className='mb-6 text-[13px] leading-relaxed text-muted'>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href='/en' className='control'>
          <ArrowLeft className='h-3.5 w-3.5' strokeWidth={1.5} aria-hidden='true' />
          Go home
        </Link>
      </div>
    </div>
  )
}
