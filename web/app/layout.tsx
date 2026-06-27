import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import { GeistPixelGrid } from 'geist/font/pixel'
import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Claros — Verifiable Real-World Data Oracle on Casper',
  description:
    'Claros is a verifiable real-world-data oracle on Casper. Energy markets (EIA: petroleum, natural gas, electricity, coal, nuclear, emissions) and civic data, attested on-chain as self-describing feeds. Read prices and metrics directly from your contract, via SDK, or over a free REST API — Pyth-style, sub-cent reads.',
  keywords: [
    'oracle',
    'Casper oracle',
    'real-world data oracle',
    'on-chain data',
    'EIA energy data',
    'verifiable data feeds',
    'Pyth alternative',
    'blockchain oracle',
    'price feeds',
    'WTI on-chain',
    'Henry Hub on-chain',
    'Casper testnet',
    'self-describing feeds',
    'cross-contract oracle',
    'Claros',
  ],
  authors: [{ name: 'Claros' }],
  creator: 'Claros',
  publisher: 'Claros',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Claros — Verifiable Real-World Data Oracle on Casper',
    description:
      'Real-world data, attested on-chain. 37 live feeds across 232 EIA datasets, self-describing and Pyth-style. Read from your contract, the SDK, or a free REST API on Casper.',
    siteName: 'Claros',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Claros — Verifiable Real-World Data Oracle on Casper',
    description:
      'Real-world data, attested on-chain. 37 live feeds across 232 EIA datasets, self-describing and Pyth-style. Read from your contract, the SDK, or a free REST API on Casper.',
    creator: '@claros',
  },
  category: 'technology',
}

export const viewport: Viewport = {
  themeColor: '#F2F1EA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${GeistPixelGrid.variable}`} suppressHydrationWarning>
      <body className="font-mono antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
