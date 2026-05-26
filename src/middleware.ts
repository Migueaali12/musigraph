import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['es', 'en']
const defaultLocale = 'es'

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    const parsed = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, quality = 'q=1.0'] = lang.trim().split(';')
        const q = parseFloat(quality.split('=')[1]) || 1.0
        return { code: code.split('-')[0], quality: q }
      })
      .sort((a, b) => b.quality - a.quality)
    
    for (const { code } of parsed) {
      if (locales.includes(code)) {
        return code
      }
    }
  }
  return defaultLocale
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) return

  // Redirect if there is no locale
  const locale = getLocale(request)
  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|musigraph-logo-vector.svg|fonts/).*)',
  ],
}
