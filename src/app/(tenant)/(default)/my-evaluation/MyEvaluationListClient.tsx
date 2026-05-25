'use client'

import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import {
  FLOW_STATUS_LABELS,
  PERIOD_TYPE_LABELS,
  type EvaluationPeriod,
  type EvaluationSheet,
} from '@/features/evaluation/types'

interface Props {
  sheets: EvaluationSheet[]
  periods: EvaluationPeriod[]
}

const FLOW_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  goal_set: 'bg-blue-50 text-blue-700',
  self_eval: 'bg-purple-50 text-purple-700',
  self_submitted: 'bg-purple-100 text-purple-800',
  primary_eval: 'bg-yellow-50 text-yellow-700',
  primary_submitted: 'bg-yellow-100 text-yellow-800',
  secondary_eval: 'bg-orange-50 text-orange-700',
  secondary_submitted: 'bg-orange-100 text-orange-800',
  confirming: 'bg-indigo-50 text-indigo-700',
  confirmed: 'bg-green-50 text-green-700',
}

export function MyEvaluationListClient({ sheets, periods }: Props) {
  const periodMap = new Map(periods.map(p => [p.id, p]))

  if (sheets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
        <p className="text-sm text-gray-500">評価シートがありません</p>
        <p className="mt-1 text-xs text-gray-400">評価期間が開始されると、ここに表示されます</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sheets.map(sheet => {
        const period = periodMap.get(sheet.period_id)
        const canSelfEval =
          sheet.flow_status === 'draft' ||
          sheet.flow_status === 'goal_set' ||
          sheet.flow_status === 'self_eval'
        return (
          <div
            key={sheet.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-primary/40 hover:shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">
                {period
                  ? `${period.fiscal_year}年度 ${PERIOD_TYPE_LABELS[period.period_type]}`
                  : '評価期間'}
              </p>
              {period && (
                <p className="mt-0.5 text-xs text-gray-400">
                  {period.start_date} 〜 {period.end_date}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FLOW_STATUS_COLORS[sheet.flow_status] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {FLOW_STATUS_LABELS[sheet.flow_status]}
              </span>
              {sheet.final_grade && (
                <span className="text-sm font-semibold text-gray-700">
                  {sheet.final_grade}
                  {sheet.final_score != null && (
                    <span className="ml-1 text-xs font-normal text-gray-500">
                      ({sheet.final_score}点)
                    </span>
                  )}
                </span>
              )}
              <Link
                href={APP_ROUTES.EVALUATION.MY_EVALUATION_SHEET(sheet.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  canSelfEval
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {canSelfEval ? '入力する' : '確認する'}
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
