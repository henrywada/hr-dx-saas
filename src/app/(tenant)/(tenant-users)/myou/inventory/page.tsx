import { getInventory } from '@/features/myou/queries'
import InventoryTable from '../components/InventoryTable'
import { Metadata } from 'next'
import { Package } from 'lucide-react'

export const metadata: Metadata = {
  title: '在庫一覧',
  description:
    '入荷済み（未出荷）のスプレー缶をシリアル番号・有効期限・入荷日つきで一覧表示します。',
}

export default async function InventoryPage() {
  const items = await getInventory()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-700 flex items-center">
            <Package className="h-6 w-6 mr-2" />
            在庫一覧
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            入荷済み・未出荷のスプレー缶（{items.length}本）。有効期限が近い順に表示しています。
          </p>
        </div>
        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
          製品トレーサビリティ
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <InventoryTable items={items} />
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">💡 運用ガイド</h3>
        <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
          <li>有効期限の近い在庫（黄色表示）から優先して出荷してください。</li>
          <li>出荷登録（QRスキャン）を行うと、この一覧から自動的に除外されます。</li>
        </ul>
      </div>
    </div>
  )
}
