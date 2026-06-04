'use client'

import { useState } from 'react'
import { RecalculateButton } from './RecalculateButton'
import { RiskRankingTable } from './RiskRankingTable'
import type { TurnoverRiskRow, TurnoverRiskSummary } from '../types'

interface Props {
  rows: TurnoverRiskRow[]
  summary: TurnoverRiskSummary
}

function SummaryCard({
  label,
  count,
  colorClass,
}: {
  label: string
  count: number
  colorClass: string
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <span className={`text-3xl font-bold ${colorClass}`}>{count}</span>
      <span className="mt-1 text-sm text-gray-600">{label}</span>
    </div>
  )
}

type FilterKey = 'all' | 'high' | 'medium' | 'low'

const PILLS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'high', label: '高リスク' },
  { key: 'medium', label: '中リスク' },
  { key: 'low', label: '低リスク' },
]

export function TurnoverRiskDashboard({ rows, summary }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all')

  const lastCalc = summary.lastCalculatedAt
    ? new Date(summary.lastCalculatedAt).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const filtered =
    filter === 'all' ? rows : rows.filter((r) => r.risk_level === filter)

  return (
    <div className="p-6">
      {/* メインカード（admin-card-and-table.md スタイル準拠） */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/turnover-risk — 離職予兆スコアリング
        </div>

        {/* カードヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              離職予兆スコアリング
            </h1>
            {lastCalc && (
              <p className="mt-1 text-xs text-gray-500">最終算出: {lastCalc}</p>
            )}
          </div>
          <RecalculateButton />
        </div>

        {/* カード本文 */}
        <div className="space-y-6 p-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard
              label="対象者合計"
              count={summary.totalCount}
              colorClass="text-gray-800"
            />
            <SummaryCard
              label="高リスク"
              count={summary.highCount}
              colorClass="text-red-600"
            />
            <SummaryCard
              label="中リスク"
              count={summary.mediumCount}
              colorClass="text-yellow-600"
            />
            <SummaryCard
              label="低リスク"
              count={summary.lowCount}
              colorClass="text-green-600"
            />
          </div>

          {/* フィルターバー */}
          <div className="-mx-6 -mt-6 mb-6 flex items-center gap-2 border-b border-gray-200 bg-white px-6 py-3.5">
            {PILLS.map((p) => (
              <button
                key={p.key}
                onClick={() => setFilter(p.key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === p.key
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
            <span className="ml-auto text-sm text-gray-500">
              {filtered.length} 名
            </span>
          </div>

          {/* ランキングテーブル */}
          <RiskRankingTable rows={filtered} />
        </div>
      </div>
    </div>
  )
}
