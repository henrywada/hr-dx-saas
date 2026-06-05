'use client'

import type { CandidateRow } from '../types'
import { READINESS_COLORS, READINESS_LABELS } from '../types'

interface Props {
  candidates: CandidateRow[]
  positionTitleMap: Map<string, string>
}

// key: "performance_score,potential_score"
const BOX_LABELS: Record<string, string> = {
  '3,3': 'スター',
  '2,3': 'ハイポテンシャル',
  '1,3': '伸び代あり',
  '3,2': '優秀貢献者',
  '2,2': 'コア人材',
  '1,2': '要育成',
  '3,1': '熟達者',
  '2,1': '安定貢献者',
  '1,1': '要注意',
}

const BOX_BG: Record<string, string> = {
  '3,3': 'bg-green-50 border-green-200',
  '2,3': 'bg-emerald-50 border-emerald-200',
  '1,3': 'bg-teal-50 border-teal-200',
  '3,2': 'bg-blue-50 border-blue-200',
  '2,2': 'bg-gray-50 border-gray-200',
  '1,2': 'bg-orange-50 border-orange-200',
  '3,1': 'bg-purple-50 border-purple-200',
  '2,1': 'bg-yellow-50 border-yellow-200',
  '1,1': 'bg-red-50 border-red-200',
}

export function NineBoxGrid({ candidates, positionTitleMap }: Props) {
  function renderBox(perf: number, poten: number) {
    const key = `${perf},${poten}`
    const boxCandidates = candidates.filter(
      c => c.performance_score === perf && c.potential_score === poten
    )

    return (
      <div key={key} className={`min-h-28 rounded-lg border p-3 ${BOX_BG[key]}`}>
        <p className="mb-2 text-[11px] font-semibold text-gray-600">{BOX_LABELS[key]}</p>
        {boxCandidates.length === 0 ? (
          <p className="text-xs text-gray-400">—</p>
        ) : (
          <div className="space-y-1.5">
            {boxCandidates.map(c => (
              <div key={c.id} className="text-xs">
                <span className="font-medium text-gray-800">{c.employee_name}</span>
                {positionTitleMap.has(c.position_id) && (
                  <span className="ml-1 text-gray-500">
                    ({positionTitleMap.get(c.position_id)})
                  </span>
                )}
                <br />
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${READINESS_COLORS[c.readiness]}`}
                >
                  {READINESS_LABELS[c.readiness]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">9-Box グリッド</h3>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>横軸: パフォーマンス →</span>
          <span>縦軸: ポテンシャル ↑</span>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Y軸ラベル */}
        <div className="flex w-6 flex-col justify-between py-2 text-center text-[10px] font-medium text-gray-400">
          <span>高</span>
          <span>中</span>
          <span>低</span>
        </div>

        <div className="flex-1">
          {/* グリッド（縦: poten 3→1、横: perf 1→3）*/}
          <div className="grid grid-cols-3 gap-2">
            {renderBox(1, 3)}
            {renderBox(2, 3)}
            {renderBox(3, 3)}
            {renderBox(1, 2)}
            {renderBox(2, 2)}
            {renderBox(3, 2)}
            {renderBox(1, 1)}
            {renderBox(2, 1)}
            {renderBox(3, 1)}
          </div>

          {/* X軸ラベル */}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px] font-medium text-gray-400">
            <span>低</span>
            <span>中</span>
            <span>高</span>
          </div>
        </div>
      </div>
    </div>
  )
}
