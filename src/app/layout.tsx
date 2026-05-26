import type { Metadata } from "next"
import { Space_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import "./globals.css"

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
})

export const metadata: Metadata = {
  title: "MusiGraph - Explorador Musical Semántico",
  description:
    "Explora el universo musical a través de datos semánticos conectados. Descubre relaciones entre artistas, géneros y colaboraciones musicales.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='es' suppressHydrationWarning>
      <body className={`${spaceMono.className} ${spaceMono.variable} antialiased`}>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem storageKey='musigraph-theme'>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
