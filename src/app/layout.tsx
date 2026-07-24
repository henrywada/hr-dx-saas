import type { Metadata } from 'next'
import { Noto_Sans_JP, Geist_Mono, Barlow, Playfair_Display } from 'next/font/google'
import '@/styles/globals.css'
import PerformancePatch from '@/components/PerformancePatch'

export const metadata: Metadata = {
  icons: {
    // PC / Android ブラウザ用（src/app/favicon.ico と同じ白い H ロゴ）
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    // iPhone / iPad のホーム画面・Safari 用（同じロゴの 180x180）
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair-display',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
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
        className={`${notoSansJP.variable} ${barlow.variable} ${geistMono.variable} ${playfairDisplay.variable} antialiased`}
      >
        <PerformancePatch />
        {children}
      </body>
    </html>
  )
}

// Trigger Vercel Build Sat Mar  7 17:42:54 JST 2026
