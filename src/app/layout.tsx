import type { Metadata } from 'next'
import { Noto_Sans_JP, Geist_Mono, Barlow } from 'next/font/google'
import '@/styles/globals.css'
import PerformancePatch from '@/components/PerformancePatch'

export const metadata: Metadata = {
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png', sizes: '192x192' }],
    apple: [{ url: '/icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
})

const barlow = Barlow({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // ここに suppressHydrationWarning を追加
    <html lang="ja" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${notoSansJP.variable} ${barlow.variable} ${geistMono.variable} antialiased`}
      >
        <PerformancePatch />
        {children}
      </body>
    </html>
  )
}

// Trigger Vercel Build Sat Mar  7 17:42:54 JST 2026
