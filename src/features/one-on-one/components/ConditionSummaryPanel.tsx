'use client'

import type { EmployeeConditionSummary } from '../types'

interface Props {
  summary: EmployeeConditionSummary
}

const DIRECTION_LABEL: Record<EmployeeConditionSummary['pulseTrendDirection'], string> = {
  up: '↑ 上昇傾向',
  down: '↓ 低下傾向',
  flat: '→ 横ばい',
  no_data: '',
}

const DIRECTION_COLOR: Record<EmployeeConditionSummary['pulseTrendDirection'], string> = {
  up: 'text-green-600',
  down: 'text-red-600',
  flat: 'text-gray-500',
  no_data: 'text-gray-400',
}

export function ConditionSummaryPanel({ summary }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-xs font-semibold text-gray-600">コンディションサマリー</p>

      <div className="mb-2">
        <p className="text-xs text-gray-500">パルスサーベイ</p>
        {summary.pulseTrendDirection === 'no_data' ? (
          <p className="text-xs text-gray-400">まだパルスサーベイの回答がありません</p>
        ) : (
          <p className="text-sm">
            <span className="font-medium text-gray-800">
              {summary.pulseTrend.map(p => p.score.toFixed(1)).join(' → ')}
            </span>
            <span
              className={`ml-2 text-xs font-medium ${DIRECTION_COLOR[summary.pulseTrendDirection]}`}
            >
              {DIRECTION_LABEL[summary.pulseTrendDirection]}
            </span>
          </p>
        )}
      </div>

      <div>
        <p className="text-xs text-gray-500">1on1実施状況</p>
        <p
          className={`text-sm font-medium ${summary.isOverdue ? 'text-orange-600' : 'text-gray-800'}`}
        >
          {summary.lastOneOnOneAt
            ? `前回実施：${summary.daysSinceLastOneOnOne}日前${summary.isOverdue ? '（30日以上未実施）' : ''}`
            : '実施記録なし'}
        </p>
      </div>
    </div>
  )
}
