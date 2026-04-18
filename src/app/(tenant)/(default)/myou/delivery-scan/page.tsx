import { Suspense } from 'react'
import { getCompanies } from '@/features/myou/actions'
import DeliveryForm from '../components/DeliveryForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '納入登録（QRスキャン）',
  description: '製品ラベルのQRコードをスキャンして納入情報を登録します。',
}

export default async function DeliveryScanPage() {
  // サーバーサイドで施工会社一覧を取得
  const companies = await getCompanies()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-700">納入登録（QRスキャン）</h1>
        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
          製品トレーサビリティ
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">QRコードスキャン</h2>
        </div>

        <div className="p-6">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500 italic">読込中...</p>
              </div>
            }
          >
            <DeliveryForm companies={companies} />
          </Suspense>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">💡 操作ガイド</h3>
        <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
          <li>最初にプルダウンから「納入先」を選択してください。</li>
          <li>カメラを起動し、製品ラベルのQRコードを枠内に収めてください。</li>
          <li>読み取りが完了すると、自動的にデータベースへ登録されます。</li>
          <li>連続して複数の製品を登録することが可能です。</li>
        </ul>
      </div>
    </div>
  )
}
