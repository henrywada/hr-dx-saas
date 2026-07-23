import { getLots } from '@/features/myou/queries'
import InventoryTable from '../components/InventoryTable'
import MyouBackLink from '../components/MyouBackLink'
import { InventoryHelpModalTrigger } from '../components/InventoryHelpModalTrigger'
import { Metadata } from 'next'
import { Package } from 'lucide-react'

export const metadata: Metadata = {
  title: '在庫一覧',
  description: '入荷済み（残数あり）のロットをロット番号・有効期限・入荷日つきで一覧表示します。',
}

export default async function InventoryPage() {
  const items = await getLots()
  const totalRemaining = items.reduce((sum, item) => sum + item.quantity_remaining, 0)

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-700 flex items-center">
            <Package className="h-6 w-6 mr-2" />
            在庫一覧
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            入荷済み・未出荷のロット（{items.length}件、残数計 {totalRemaining}
            本）。有効期限が近い順に表示しています。
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <InventoryHelpModalTrigger />
          <MyouBackLink />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <InventoryTable items={items} />
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">💡 運用ガイド</h3>
        <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
          <li>有効期限の近い在庫（黄色表示）から優先して出荷してください。</li>
          <li>
            出荷登録（QRスキャン）で残数が0になったロットは、この一覧から自動的に除外されます。
          </li>
        </ul>
      </div>
    </div>
  )
}
