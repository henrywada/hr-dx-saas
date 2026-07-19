import { getCompanies, getDeliveryLogs } from '@/features/myou/queries'
import DeliveryHistoryTable from '../components/DeliveryHistoryTable'
import MyouBackLink from '../components/MyouBackLink'
import { Metadata } from 'next'
import { History } from 'lucide-react'

export const metadata: Metadata = {
  title: '出荷リスト',
  description: '出荷データ履歴を出荷先（施工会社）で絞り込んで確認します。',
}

export default async function DeliveryHistoryPage() {
  const [companies, logs] = await Promise.all([getCompanies(), getDeliveryLogs()])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-700 flex items-center">
            <History className="h-6 w-6 mr-2" />
            出荷リスト
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            これまでの出荷データ履歴（{logs.length}
            件）を出荷日の新しい順に表示しています。出荷先で絞り込むこともできます。
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MyouBackLink />
          <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
            製品トレーサビリティ
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <DeliveryHistoryTable logs={logs} companies={companies} />
      </div>
    </div>
  )
}
