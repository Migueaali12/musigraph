import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
    <html lang='es'>
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  )
}
