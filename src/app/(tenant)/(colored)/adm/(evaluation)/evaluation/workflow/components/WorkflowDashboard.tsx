'use client'

import { useState } from 'react'
import type { EvaluationPeriod } from '@/features/evaluation/types'
import { PERIOD_STATUS_LABELS, PERIOD_TYPE_LABELS } from '@/features/evaluation/types'
import type {
  PhaseCount,
  PendingEmployee,
  ReminderRecord,
} from '@/features/evaluation/workflow-types'
import { PhaseSummaryBar } from './PhaseSummaryBar'
import { PendingList } from './PendingList'
import { ReminderHistory } from './ReminderHistory'

interface Props {
  periods: EvaluationPeriod[]
  activePeriod: EvaluationPeriod
  phaseCounts: PhaseCount[]
  pendingEmployees: PendingEmployee[]
  reminderHistory: ReminderRecord[]
}

type Tab = 'pending' | 'history'

export function WorkflowDashboard({
  activePeriod,
  phaseCounts,
  pendingEmployees,
  reminderHistory,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const totalCount = phaseCounts.reduce((sum, p) => sum + p.count, 0)
  const overdueCount = pendingEmployees.filter(
    e => e.days_remaining !== null && e.days_remaining < 0
  ).length
  const urgentCount = pendingEmployees.filter(
    e => e.days_remaining !== null && e.days_remaining >= 0 && e.days_remaining <= 3
  ).length

  return (
    <div className="space-y-5">
      {/* 期間情報バナー */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span className="text-sm font-semibold text-gray-800">{activePeriod.name}</span>
            <span className="ml-2 text-xs text-gray-500">
              {PERIOD_TYPE_LABELS[activePeriod.period_type]} / {activePeriod.fiscal_year}年度
            </span>
          </div>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/30">
            {PERIOD_STATUS_LABELS[activePeriod.status]}
          </span>
          <span className="text-xs text-gray-400">
            {activePeriod.start_date} 〜 {activePeriod.end_date}
          </span>
        </div>
      </div>

      {/* アラートバナー */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-red-500">⚠</span>
          <p className="text-sm font-medium text-red-700">
            期限超過:{' '}
            <span className="font-bold">{overdueCount}名</span>
            {urgentCount > 0 && (
              <span className="ml-3 text-yellow-700">
                期限3日以内: <span className="font-bold">{urgentCount}名</span>
              </span>
            )}
          </p>
        </div>
      )}

      {/* フェーズ進捗バー */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          フェーズ別進捗（全 {totalCount} 名）
        </h2>
        <PhaseSummaryBar phaseCounts={phaseCounts} totalCount={totalCount} />
      </section>

      <div className="border-t border-gray-200" />

      {/* タブ切り替え */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          未提出者一覧
          {pendingEmployees.length > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {pendingEmployees.length}
            </span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          催促履歴
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'pending' ? (
        <PendingList periodId={activePeriod.id} pendingEmployees={pendingEmployees} />
      ) : (
        <ReminderHistory records={reminderHistory} />
      )}
    </div>
  )
}
