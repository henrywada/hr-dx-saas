'use client'

import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import {
  OBJECTIVE_STATUS_LABELS,
  OBJECTIVE_STATUS_COLORS,
  OBJECTIVE_OWNER_TYPE_LABELS,
  KEY_RESULT_STATUS_LABELS,
  KEY_RESULT_STATUS_COLORS,
} from '../types'
import type { ObjectiveWithDetails } from '../types'

interface Props {
  objective: ObjectiveWithDetails
  onCheckin?: (
    krId: string,
    krTitle: string,
    krType: string,
    targetValue: number | null,
    unit: string | null
  ) => void
}

function progressBarColor(progress: number): string {
  if (progress >= 70) return 'bg-green-500'
  if (progress >= 40) return 'bg-yellow-400'
  return 'bg-red-500'
}

export function ObjectiveCard({ objective, onCheckin }: Props) {
  const statusClass = OBJECTIVE_STATUS_COLORS[objective.status] ?? 'text-gray-600 bg-gray-100'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {OBJECTIVE_OWNER_TYPE_LABELS[objective.owner_type]}
            </span>
            {objective.owner_name && (
              <span className="text-xs text-gray-500 truncate">{objective.owner_name}</span>
            )}
            <span className="text-xs text-gray-400">{objective.period_label}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{objective.title}</h3>
        </div>
        <span
          className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusClass}`}
        >
          {OBJECTIVE_STATUS_LABELS[objective.status]}
        </span>
      </div>

      {/* 全体進捗バー */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">進捗</span>
          <span className="text-sm font-bold text-gray-900">{objective.progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full transition-all ${progressBarColor(objective.progress)}`}
            style={{ width: `${Math.min(100, objective.progress)}%` }}
          />
        </div>
      </div>

      {/* KR一覧 */}
      {objective.key_results.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-gray-500">
            Key Results ({objective.key_results.length}件)
          </p>
          {objective.key_results.map(kr => {
            const krStatusClass = KEY_RESULT_STATUS_COLORS[kr.status] ?? 'text-gray-600 bg-gray-50'
            return (
              <div key={kr.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-700 truncate">{kr.title}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-medium text-gray-900">{kr.progress}%</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${krStatusClass}`}>
                        {KEY_RESULT_STATUS_LABELS[kr.status]}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-1.5 rounded-full transition-all ${progressBarColor(kr.progress)}`}
                      style={{ width: `${Math.min(100, kr.progress)}%` }}
                    />
                  </div>
                </div>
                {onCheckin && kr.status !== 'cancelled' && kr.status !== 'completed' && (
                  <button
                    onClick={() => onCheckin(kr.id, kr.title, kr.kr_type, kr.target_value, kr.unit)}
                    className="flex-shrink-0 text-xs text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                  >
                    記録
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* フッター */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <Link
          href={APP_ROUTES.TENANT.ADMIN_OKR_DETAIL(objective.id)}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          詳細
        </Link>
      </div>
    </div>
  )
}
