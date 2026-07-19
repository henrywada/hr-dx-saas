import { Suspense } from 'react'
import { getCompanies, getLots } from '@/features/myou/queries'
import DeliveryForm from '../components/DeliveryForm'
import MyouBackLink from '../components/MyouBackLink'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '出荷登録（QRスキャン）',
  description: '施工会社への出荷数量を指定し、ロットQRコードをスキャンして出荷情報を登録します。',
}

export default async function DeliveryScanPage() {
  // サーバーサイドで施工会社一覧・在庫一覧（「在庫表より」タブ用）を取得
  const [companies, lots] = await Promise.all([getCompanies(), getLots()])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <h1 className="text-2xl font-bold text-blue-700">出荷登録（QRスキャン）</h1>
        <div className="flex flex-col items-end gap-1">
          <MyouBackLink />
          <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
            製品トレーサビリティ
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-8">
        <div className="p-6">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500 italic">読込中...</p>
              </div>
            }
          >
            <DeliveryForm companies={companies} lots={lots} />
          </Suspense>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">💡 操作ガイド</h3>
        <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
          <li>
            最初にプルダウンから「出荷先（施工会社）」を選択し、受注数量（缶の本数）を入力してください。
          </li>
          <li>
            「QRスキャン」タブ：ロットQRコードを枠内に収めてスキャンしてください。「在庫表より」タブ：出荷したいロットの「出荷」ボタンから数量を指定して出荷できます。
          </li>
          <li>
            登録が完了すると、出荷先・出荷日とあわせて自動的に登録され、トレーサビリティQRの印刷画面が開きます。
          </li>
          <li>
            指定したロットの残数が出荷数量に満たない場合はエラーになります。自動で他ロットへ分割せず、別のロットを再スキャン・再選択してください。
          </li>
          <li>
            ロットの残数が0になった在庫は「在庫表より」タブ・「在庫一覧」から自動的に除外されます。
          </li>
        </ul>
      </div>
    </div>
  )
}
