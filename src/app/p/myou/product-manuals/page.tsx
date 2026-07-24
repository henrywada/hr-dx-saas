import { BookOpen, ChevronRight } from 'lucide-react'
import { PRODUCT_MANUALS } from './manuals'

export const metadata = { title: '取扱説明書' }

/**
 * 製品ラベル QR 向けの公開取扱説明書メニュー。
 * 認証・DB・SaaS 内導線は持たない（購入客専用）。
 * 衛生製品向けに光沢グリーン＋清潔感のある見た目にする。
 */
export default function MyouProductManualsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 flex items-start justify-center p-4 sm:p-6">
      <div className="w-full max-w-md mt-8 rounded-2xl overflow-hidden bg-white shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-900/5">
        {/* ヘッダー：光沢のある緑（グラデーション＋ハイライト） */}
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 px-6 py-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-teal-300/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/35 backdrop-blur-sm shadow-sm shadow-emerald-900/20">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
              取扱説明書
            </h1>
          </div>
        </header>

        <nav className="px-2 py-2" aria-label="取扱説明書メニュー">
          <ul>
            {PRODUCT_MANUALS.map((item, index) => {
              const Icon = item.icon
              const isLast = index === PRODUCT_MANUALS.length - 1
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl text-slate-800 transition-colors hover:bg-emerald-50/70 active:bg-emerald-50 ${
                      !isLast ? 'border-b border-emerald-50' : ''
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/80">
                      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="flex-1 text-sm font-semibold leading-snug">{item.label}</span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <footer className="border-t border-emerald-50 bg-emerald-50/40 px-6 py-4">
          <p className="text-xs text-slate-500">ミュー株式会社</p>
        </footer>
      </div>
    </div>
  )
}
