import { Metadata } from 'next'
import { BookOpen } from 'lucide-react'
import { getProductManuals } from '@/features/myou/queries'
import MyouBackLink from '../components/MyouBackLink'
import ProductManualUploadForm from '../components/ProductManualUploadForm'

export const metadata: Metadata = {
  title: '取扱説明書画像の取り込み',
  description: 'エアコン用・浴室用の取扱説明書画像をアップロードして公開ページに反映します。',
}

export default async function MyouProductManualsUploadPage() {
  const manuals = await getProductManuals()

  return (
    <div className="w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-700 flex items-center">
            <BookOpen className="h-6 w-6 mr-2" />
            取扱説明書画像の取り込み
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            画像をアップロードし、エアコン用または浴室用として保存します。公開 QR
            ページに反映されます（Supabase Storage
            保存のため、ローカル検証画像は本番に同期されません）。
          </p>
        </div>
        <MyouBackLink />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <ProductManualUploadForm initialManuals={manuals} />
      </div>
    </div>
  )
}
