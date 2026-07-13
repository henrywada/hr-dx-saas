'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LaborComplianceBundle } from '@/features/labor-compliance/types'
import { OvertimeAlertPanel } from './OvertimeAlertPanel'
import { PaidLeavePanel } from './PaidLeavePanel'
import { Article36Panel } from './Article36Panel'
import { DivisionHeatmap } from './DivisionHeatmap'
import { LaborComplianceHelpModalTrigger } from './LaborComplianceHelpModalTrigger'
import TenantBackLink from '@/components/common/TenantBackLink'

type Tab = 'overtime' | 'paid_leave' | 'article36' | 'heatmap'

type Props = { bundle: LaborComplianceBundle }

export default function LaborComplianceDashboard({ bundle }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overtime')
  const router = useRouter()

  const { summary, yearMonth } = bundle

  function handleMonthChange(ym: string) {
    router.push(`?ym=${ym}`)
  }

  function shiftMonth(ym: string, delta: number): string {
    const [y, m] = ym.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const tabs: { key: Tab; label: string; count: number; color: string }[] = [
    {
      key: 'overtime',
      label: '残業アラート',
      count: summary.unresolvedAlertCount,
      color: summary.unresolvedAlertCount > 0 ? 'text-red-600' : 'text-green-600',
    },
    {
      key: 'paid_leave',
      label: '有休取得義務',
      count: summary.paidLeaveAtRiskCount,
      color: summary.paidLeaveAtRiskCount > 0 ? 'text-amber-600' : 'text-green-600',
    },
    {
      key: 'article36',
      label: '36協定特別条項',
      count: summary.article36SubjectCount,
      color: summary.article36SubjectCount > 0 ? 'text-red-600' : 'text-green-600',
    },
    {
      key: 'heatmap',
      label: '部署別ヒートマップ',
      count: 0,
      color: '',
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">労務コンプライアンスダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">36協定・有休義務・残業アラートを一元管理</p>
        </div>
        {/* 月選択 */}
        <div className="flex items-center gap-2">
          <LaborComplianceHelpModalTrigger />
          <TenantBackLink />
          <button
            onClick={() => handleMonthChange(shiftMonth(yearMonth, -1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
            aria-label="前月"
          >
            ←
          </button>
          <span className="text-sm font-medium px-3">{yearMonth.replace('-', '年')}月</span>
          <button
            onClick={() => handleMonthChange(shiftMonth(yearMonth, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
            aria-label="翌月"
          >
            →
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">総従業員数</p>
          <p className="text-2xl font-bold text-gray-900">
            {summary.totalEmployees}
            <span className="text-sm font-normal ml-1">名</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">未解決アラート</p>
          <p
            className={`text-2xl font-bold ${summary.unresolvedAlertCount > 0 ? 'text-red-600' : 'text-green-600'}`}
          >
            {summary.unresolvedAlertCount}
            <span className="text-sm font-normal ml-1">件</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">有休義務未達リスク</p>
          <p
            className={`text-2xl font-bold ${summary.paidLeaveAtRiskCount > 0 ? 'text-amber-600' : 'text-green-600'}`}
          >
            {summary.paidLeaveAtRiskCount}
            <span className="text-sm font-normal ml-1">名</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">36協定特別条項対象</p>
          <p
            className={`text-2xl font-bold ${summary.article36SubjectCount > 0 ? 'text-red-600' : 'text-green-600'}`}
          >
            {summary.article36SubjectCount}
            <span className="text-sm font-normal ml-1">名</span>
          </p>
        </div>
      </div>

      {/* タブ */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="タブ">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 text-xs font-bold ${tab.color}`}>{tab.count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === 'overtime' && <OvertimeAlertPanel alerts={bundle.overtimeAlerts} />}
        {activeTab === 'paid_leave' && (
          <PaidLeavePanel rows={bundle.paidLeaveProgress} yearMonth={yearMonth} />
        )}
        {activeTab === 'article36' && <Article36Panel rows={bundle.article36Subjects} />}
        {activeTab === 'heatmap' && <DivisionHeatmap rows={bundle.divisionHeatmap} />}
      </div>
    </div>
  )
}
