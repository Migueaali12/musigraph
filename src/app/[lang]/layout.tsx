import type { Metadata } from "next"
import { Space_Mono } from "next/font/google"
import "@/app/globals.css"
import { getDictionary, type Locale } from "@/dictionaries/getDictionary"
import { ThemeProvider } from "@/components/common/ThemeProvider"

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
})

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{
    lang: string
  }>
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
      <body className={`${spaceMono.className} ${spaceMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
