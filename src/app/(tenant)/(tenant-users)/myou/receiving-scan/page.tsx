import { Suspense } from 'react'
import ReceivingForm from '../components/ReceivingForm'
import MyouBackLink from '../components/MyouBackLink'
import ReceivingTestQrButton from '../components/ReceivingTestQrButton'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '入荷登録（QRスキャン）',
  description:
    '製造元から納品された段ボール（ロット）のQRコードをスキャンして在庫として登録します。',
}

export default function ReceivingScanPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <h1 className="text-2xl font-bold text-blue-700">入荷登録（QRスキャン）</h1>
        <div className="flex flex-col items-end gap-1">
          <MyouBackLink />
          <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
            製品トレーサビリティ
          </div>
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
          <li>
            製造元から段ボール（ロット）が納品されたら、この画面でロットQRコードをスキャンしてください。
          </li>
          <li>
            スキャン後に「入荷処理へ進む」を押すと、ロット番号・有効期限を確認したうえで数量（缶の本数）を入力して在庫登録できます。
          </li>
          <li>
            QRコードをスキャンせずに「入荷処理へ進む」を押した場合は、ロット番号を自動採番して新規登録できます。
          </li>
          <li>
            同じロットを複数回スキャンした場合は、数量が加算登録されます（複数回に分けて納品された場合など）。
          </li>
          <li>登録した在庫は「在庫一覧」画面で確認できます。</li>
          <li>
            QRコード形式：LOT:&lt;ロット番号&gt;,MFG:&lt;製造日YYYY-MM-DD&gt;,EXP:&lt;有効期限YYYY-MM-DD&gt;
          </li>
          <li>ロット番号：LOT-YYYYMMDD-NNNN（発行日、当日通番4桁ゼロ埋め）</li>
        </ul>
        <ReceivingTestQrButton />
      </div>
    </div>
  )
}
