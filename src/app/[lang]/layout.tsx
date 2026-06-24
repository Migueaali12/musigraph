import type { Metadata } from "next"
import { Inter, Space_Mono } from "next/font/google"
import "@/app/globals.css"
import { getDictionary, type Locale } from "@/dictionaries/getDictionary"
import { ThemeProvider } from "@/components/common/ThemeProvider"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
})

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{
    lang: string
  }>
}

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }]
}

export async function generateMetadata({ params }: Omit<LayoutProps, "children">): Promise<Metadata> {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale)

  return {
    title: dict.metadata.title,
    description: dict.metadata.description,
    alternates: {
      languages: {
        'en': '/en',
        'es': '/es',
      },
    },
  }
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { lang } = await params

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="musigraph-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
