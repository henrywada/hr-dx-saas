import { Suspense } from 'react'
import ReceivingForm from '../components/ReceivingForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '入荷登録（QRスキャン）',
  description: '製造元から納品されたスプレー缶のQRコードをスキャンして在庫として登録します。',
}

export default function ReceivingScanPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-700">入荷登録（QRスキャン）</h1>
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
            <ReceivingForm />
          </Suspense>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">💡 操作ガイド</h3>
        <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
          <li>製造元からスプレー缶が納品されたら、この画面でQRコードをスキャンしてください。</li>
          <li>読み取りが完了すると、シリアル番号・有効期限・入荷日が在庫として登録されます。</li>
          <li>連続して複数の製品を登録することが可能です。</li>
          <li>登録した在庫は「在庫一覧」画面で確認できます。</li>
        </ul>
      </div>
    </div>
  )
}
