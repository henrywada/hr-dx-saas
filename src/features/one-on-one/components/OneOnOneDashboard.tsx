'use client'

import { useState } from 'react'
import { SessionFormModal } from './SessionFormModal'
import { ImplementationRateChart } from './ImplementationRateChart'
import { SessionHistoryTable } from './SessionHistoryTable'
import { ReminderBadge } from './ReminderBadge'
import type { OneOnOneDashboardData } from '../types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  data: OneOnOneDashboardData
  employees: Employee[]
}

export function OneOnOneDashboard({ data, employees }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="p-6">
      {/* メインカード（admin-card-and-table.md スタイル準拠） */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/one-on-one — 1on1支援機能
        </div>

        {/* カードヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              1on1 支援ダッシュボード
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              実施率の可視化・テーマ標準化・未実施リマインダー
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-[#FD7601] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#FD7601] transition-colors"
          >
            + 記録する
          </button>
        </div>

        {/* カード本文 */}
        <div className="space-y-8 p-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                直近30日 実施件数
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {data.totalSessionsLast30Days}
                <span className="ml-1 text-sm font-normal text-gray-400">件</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                平均実施率
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  data.averageRate >= 80
                    ? 'text-green-600'
                    : data.averageRate >= 50
                      ? 'text-amber-600'
                      : 'text-red-600'
                }`}
              >
                {data.averageRate}
                <span className="ml-1 text-sm font-normal text-gray-400">%</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                未実施リマインダー
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  data.overdueEmployees.length > 0 ? 'text-orange-500' : 'text-gray-900'
                }`}
              >
                {data.overdueEmployees.length}
                <span className="ml-1 text-sm font-normal text-gray-400">名</span>
              </p>
            </div>
          </div>

          {/* 未実施リマインダー */}
          {data.overdueEmployees.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-gray-700">
                未実施リマインダー（30日以上）
              </h2>
              <ReminderBadge overdueEmployees={data.overdueEmployees} />
            </section>
          )}

          {/* 管理職別実施率グラフ */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-700">
              管理職別 実施率ランキング（直近30日）
            </h2>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <ImplementationRateChart data={data.implementationRates} />
            </div>
          </section>

          {/* セッション履歴テーブル */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-700">
              直近 セッション記録（最新50件）
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <SessionHistoryTable sessions={data.sessions} />
            </div>
          </section>
        </div>
      </div>

      {/* 記録モーダル */}
      <SessionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employees={employees}
        templates={data.themeTemplates}
      />
    </div>
  )
}
