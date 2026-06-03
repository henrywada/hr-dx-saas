import Link from 'next/link'
import { getRecruitFunnelData } from '@/features/job-postings/queries'
import { FunnelPageClient } from './FunnelPageClient'

export const metadata = {
  title: '採用プロセスダッシュボード | HR-DX',
}

export default async function RecruitFunnelPage() {
  const data = await getRecruitFunnelData()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* パスバー */}
      <div className="-mx-6 -mt-6 border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600 flex items-center gap-1">
        <Link href="/adm/job-positions" className="hover:underline">
          採用管理
        </Link>
        <span>—</span>
        <span>採用プロセスダッシュボード</span>
      </div>

      {/* ページヘッダー */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            採用プロセスダッシュボード
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            選考プロセス・放置候補者・担当者別タスクを一元管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/adm/job-positions"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            求人票管理
          </Link>
        </div>
      </div>

      {/* Client Component でステージクリック・ドリルダウンを管理 */}
      <FunnelPageClient
        funnelCounts={data.funnelCounts}
        staleCandidates={data.staleCandidates}
        assigneeCounts={data.assigneeCounts}
        withdrawalTrend={data.withdrawalTrend}
        staleThresholdDays={data.staleThresholdDays}
      />
    </div>
  )
}
