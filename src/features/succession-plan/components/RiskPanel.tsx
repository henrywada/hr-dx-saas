'use client'

import type { PositionWithCandidates } from '../types'
import { RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, READINESS_COLORS, READINESS_LABELS } from '../types'

interface Props {
  positions: PositionWithCandidates[]
}

export function RiskPanel({ positions }: Props) {
  const noSuccessor = positions.filter(p => p.candidates.length === 0)
  const noReadyNow = positions.filter(
    p => p.candidates.length > 0 && !p.candidates.some(c => c.readiness === 'ready_now')
  )

  return (
    <div className="space-y-8">
      {/* 後継者不在ポジション */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-bold">
            !
          </span>
          後継者不在ポジション
          <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
            {noSuccessor.length} 件
          </span>
        </h3>

        {noSuccessor.length === 0 ? (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            すべてのポジションに後継候補が登録されています。
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-red-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-2 font-medium">ポジション</th>
                  <th className="px-4 py-2 font-medium">部署</th>
                  <th className="px-4 py-2 font-medium">現任者</th>
                  <th className="px-4 py-2 font-medium">リスク設定</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {noSuccessor.map(p => (
                  <tr key={p.id} className="bg-white transition-colors hover:bg-red-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                    <td className="px-4 py-3 text-gray-600">{p.division_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.current_holder_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_COLORS[p.risk_level]}`}
                      >
                        {RISK_LEVEL_LABELS[p.risk_level]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ready Now 候補不在ポジション */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-700">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-xs font-bold">
            △
          </span>
          Ready Now 候補不在ポジション
          <span className="ml-auto rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
            {noReadyNow.length} 件
          </span>
        </h3>

        {noReadyNow.length === 0 ? (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            すべてのポジションに Ready Now 候補がいます。
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-yellow-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-yellow-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-2 font-medium">ポジション</th>
                  <th className="px-4 py-2 font-medium">最短候補者</th>
                  <th className="px-4 py-2 font-medium">候補者数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {noReadyNow.map(p => {
                  const shortestCandidate =
                    p.candidates.find(c => c.readiness === 'one_to_two_years') ?? p.candidates[0]
                  return (
                    <tr key={p.id} className="bg-white transition-colors hover:bg-yellow-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                      <td className="px-4 py-3">
                        {shortestCandidate ? (
                          <span>
                            {shortestCandidate.employee_name}
                            <span
                              className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${READINESS_COLORS[shortestCandidate.readiness]}`}
                            >
                              {READINESS_LABELS[shortestCandidate.readiness]}
                            </span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.candidates.length} 名</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
