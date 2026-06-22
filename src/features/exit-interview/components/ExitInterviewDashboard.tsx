'use client'

import { useState } from 'react'
import { ExitInterviewList } from './ExitInterviewList'
import { ReasonDistributionChart } from './ReasonDistributionChart'
import { TrendChart } from './TrendChart'
import { AttributeAnalysis } from './AttributeAnalysis'
import type { ExitInterview, ExitInterviewAnalytics } from '@/features/exit-interview/types'
import { MAIN_REASON_LABELS } from '@/features/exit-interview/types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  records: ExitInterview[]
  analytics: ExitInterviewAnalytics
  employees: Employee[]
}

type DashboardTab = 'analytics' | 'records'

export function ExitInterviewDashboard({ records, analytics, employees }: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('analytics')

  const topReason = [...analytics.reason_distribution].sort((a, b) => b.count - a.count)[0]
  const last12Count = analytics.monthly_trend.reduce((s, m) => s + m.count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#24292f]">退職理由分析</h1>
        <p className="text-sm text-[#57606a]">退職面談記録の蓄積と傾向分析</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#e2e6ec] rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary">{analytics.total}</p>
          <p className="text-xs text-[#57606a] mt-1">累計記録数</p>
        </div>
        <div className="bg-white border border-[#e2e6ec] rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-[#24292f]">{last12Count}</p>
          <p className="text-xs text-[#57606a] mt-1">直近12ヶ月</p>
        </div>
        <div className="bg-white border border-[#e2e6ec] rounded-xl p-4 text-center col-span-2">
          {topReason ? (
            <>
              <p className="text-sm font-semibold text-[#24292f]">
                {MAIN_REASON_LABELS[topReason.reason]}
              </p>
              <p className="text-xs text-[#57606a] mt-1">最多退職理由（{topReason.count}件）</p>
            </>
          ) : (
            <p className="text-sm text-[#57606a]">データなし</p>
          )}
        </div>
      </div>

      <div className="border-b border-[#e2e6ec]">
        <div className="flex gap-0">
          {(
            [
              ['analytics', '分析ダッシュボード'],
              ['records', '面談記録一覧'],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary font-medium'
                  : 'text-[#57606a] hover:text-[#24292f]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-[#e2e6ec] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#24292f] mb-4">退職理由の分布</h3>
              <ReasonDistributionChart data={analytics.reason_distribution} />
            </div>
            <div className="bg-white border border-[#e2e6ec] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#24292f] mb-4">
                月次退職件数（直近12ヶ月）
              </h3>
              <TrendChart data={analytics.monthly_trend} />
            </div>
          </div>

          <div className="bg-white border border-[#e2e6ec] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#24292f] mb-4">属性別傾向分析</h3>
            <AttributeAnalysis analytics={analytics} />
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="bg-white border border-[#e2e6ec] rounded-xl p-5">
          <ExitInterviewList records={records} employees={employees} />
        </div>
      )}
    </div>
  )
}
