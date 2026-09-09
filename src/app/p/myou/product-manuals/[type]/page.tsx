import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { getPublicProductManual } from '@/features/myou/queries'
import type { ProductManualType } from '@/features/myou/types'
import { PRODUCT_MANUAL_LABELS } from '@/features/myou/types'
import { APP_ROUTES } from '@/config/routes'

/** アップロード後も最新を返す（ビルド時の空状態キャッシュを防ぐ） */
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ type: string }>
}

function isManualType(value: string): value is ProductManualType {
  return value === 'aircon' || value === 'bathroom'
}

export async function generateMetadata({ params }: Props) {
  const { type } = await params
  if (!isManualType(type)) return { title: '取扱説明書' }
  return { title: PRODUCT_MANUAL_LABELS[type] }
}

/**
 * 購入客向け：アップロード済み取扱説明書画像の表示
 */
export default async function MyouProductManualImagePage({ params }: Props) {
  const { type } = await params
  if (!isManualType(type)) notFound()

  const manual = await getPublicProductManual(type)
  if (!manual) notFound()

  return (
    <div className="min-h-screen bg-black flex items-start justify-center p-4 sm:p-6">
      <div className="w-full max-w-md mt-8 rounded-2xl overflow-hidden bg-white shadow-xl shadow-black/40 ring-1 ring-white/10">
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 px-6 py-5">
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/35">
              <BookOpen className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-base font-bold tracking-tight text-white">{manual.label}</h1>
          </div>
        </header>

        <div className="p-3 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={manual.public_url}
            alt={manual.label}
            className="w-full rounded-lg object-contain bg-white border border-slate-100"
          />
        </div>

        <footer className="border-t border-emerald-50 bg-emerald-50/40 px-6 py-4 flex items-center justify-between gap-3">
          <Link
            href={APP_ROUTES.PUBLIC.MYOU_PRODUCT_MANUALS}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            メニューへ戻る
          </Link>
          <p className="text-xs text-slate-500">ミュー株式会社</p>
        </footer>
      </div>
    </div>
  )
}
