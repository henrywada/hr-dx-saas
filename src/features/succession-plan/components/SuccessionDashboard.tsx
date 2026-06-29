'use client'

import { useState } from 'react'
import { PositionFormModal } from './PositionFormModal'
import { PositionPanel } from './PositionPanel'
import { NineBoxGrid } from './NineBoxGrid'
import { RiskPanel } from './RiskPanel'
import type { SuccessionDashboardData, EmployeeOption, DivisionOption } from '../types'
import type { CareerDiscussionRow } from '@/features/career-discussions/types'

interface Props {
  data: SuccessionDashboardData
  employees: EmployeeOption[]
  divisions: DivisionOption[]
  /** 候補者の直近のキャリア面談記録（読み取り専用の参照パネル用。employee_id をキーとする） */
  careerDiscussionsByEmployee: Record<string, CareerDiscussionRow[]>
}

type TabId = 'positions' | 'nine_box' | 'risk'

const TABS: { id: TabId; label: string }[] = [
  { id: 'positions', label: 'ポジション管理' },
  { id: 'nine_box', label: '9-Box グリッド' },
  { id: 'risk', label: '依存リスク' },
]

export function SuccessionDashboard({
  data,
  employees,
  divisions,
  careerDiscussionsByEmployee,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('positions')
  const [addPositionOpen, setAddPositionOpen] = useState(false)

  const allCandidates = data.positions.flatMap(p => p.candidates)
  const positionTitleMap = new Map(data.positions.map(p => [p.id, p.title]))

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/succession — サクセッションプラン
        </div>

        {/* カードヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              サクセッションプラン（後継者管理）
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              重要ポジションの後継候補を管理し、組織の継続性リスクを可視化する
            </p>
          </div>
          <button
            onClick={() => setAddPositionOpen(true)}
            className="rounded-lg bg-[#FD7601] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#FD7601]"
          >
            + ポジションを追加
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* KPI サマリーカード */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                重要ポジション数
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{data.positions.length}</p>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                data.noSuccessorCount > 0
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                後継者不在
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  data.noSuccessorCount > 0 ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {data.noSuccessorCount}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">ポジション</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Ready Now 候補あり
              </p>
              <p className="mt-2 text-3xl font-bold text-green-600">{data.readyNowCount}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                ポジション（全 {data.positions.length} 中）
              </p>
            </div>
          </div>

          {/* タブ */}
          <div>
            <div className="flex border-b border-gray-200">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-[#FD7601] text-[#FD7601]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="pt-4">
              {activeTab === 'positions' && (
                <PositionPanel
                  positions={data.positions}
                  employees={employees}
                  divisions={divisions}
                  careerDiscussionsByEmployee={careerDiscussionsByEmployee}
                  onAddPosition={() => setAddPositionOpen(true)}
                />
              )}
              {activeTab === 'nine_box' &&
                (allCandidates.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-400">
                    候補者が登録されていません
                  </p>
                ) : (
                  <NineBoxGrid candidates={allCandidates} positionTitleMap={positionTitleMap} />
                ))}
              {activeTab === 'risk' && <RiskPanel positions={data.positions} />}
            </div>
          </div>
        </div>
      </div>

      {addPositionOpen && (
        <PositionFormModal
          employees={employees}
          divisions={divisions}
          onClose={() => setAddPositionOpen(false)}
        />
      )}
    </div>
  )
}
