'use client'

import { useState } from 'react'
import { RiskLevelBadge } from './RiskLevelBadge'
import { RiskFactorBreakdown } from './RiskFactorBreakdown'
import { ActionLogModal } from './ActionLogModal'
import { ACTION_TYPE_LABELS } from '../types'
import type { TurnoverRiskRow } from '../types'

interface Props {
  rows: TurnoverRiskRow[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function RiskRankingTable({ rows }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modalEmployee, setModalEmployee] = useState<{
    id: string
    name: string
  } | null>(null)

  if (rows.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400">
        スコアデータがありません。「スコア再計算」ボタンを押してください。
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  順位
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  氏名
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  部署
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                  リスクレベル
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                  スコア
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  直近アクション
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  算出日
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <>
                  <tr
                    key={row.employee_id}
                    className={`${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)]`}
                  >
                    <td className="border-b border-gray-200 px-4 py-3 text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 font-medium text-gray-900">
                      {row.employee_name}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-gray-600">
                      {row.department_name ?? '—'}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-center">
                      <RiskLevelBadge level={row.risk_level} />
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-center">
                      <span
                        className={`font-bold ${
                          row.risk_score >= 60
                            ? 'text-red-600'
                            : row.risk_score >= 30
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {row.risk_score}
                      </span>
                      <span className="text-gray-400"> / 100</span>
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-gray-600">
                      {row.latest_action_type ? (
                        `${ACTION_TYPE_LABELS[row.latest_action_type]}（${formatDate(row.latest_action_at!)}）`
                      ) : (
                        <span className="text-gray-400">未実施</span>
                      )}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-gray-600">
                      {formatDate(row.calculated_at)}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            setExpandedId(
                              expandedId === row.employee_id ? null : row.employee_id
                            )
                          }
                          className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          {expandedId === row.employee_id ? '閉じる' : '詳細'}
                        </button>
                        <button
                          onClick={() =>
                            setModalEmployee({
                              id: row.employee_id,
                              name: row.employee_name,
                            })
                          }
                          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90"
                        >
                          記録
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === row.employee_id && (
                    <tr key={`${row.employee_id}-detail`}>
                      <td
                        colSpan={8}
                        className="border-b border-gray-200 bg-gray-50 px-8 py-4"
                      >
                        <RiskFactorBreakdown factors={row.score_factors} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalEmployee && (
        <ActionLogModal
          employeeId={modalEmployee.id}
          employeeName={modalEmployee.name}
          isOpen={true}
          onClose={() => setModalEmployee(null)}
        />
      )}
    </>
  )
}
