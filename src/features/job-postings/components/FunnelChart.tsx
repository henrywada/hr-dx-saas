'use client'

import { ACTIVE_STAGES, STAGE_LABELS, type FunnelStageCount, type CandidateStage } from '../types'

interface Props {
  funnelCounts: FunnelStageCount[]
  onStageClick?: (stage: CandidateStage) => void
}

/** ステージ間の通過率を計算する（前ステージ → 現ステージ） */
function calcConversionRate(prev: number, current: number): string | null {
  if (prev === 0) return null
  return Math.round((current / prev) * 100) + '%'
}

export function FunnelChart({ funnelCounts, onStageClick }: Props) {
  // ACTIVE_STAGES 順に並べる
  const ordered = ACTIVE_STAGES.map(
    stage => funnelCounts.find(c => c.stage === stage) ?? { stage, count: 0, stale_count: 0 }
  )

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="bg-gray-200 border-b border-gray-300 px-6 py-4">
        <h2 className="text-lg font-bold tracking-tight text-gray-900">選考プロセス</h2>
        <p className="text-sm text-gray-500 mt-0.5">全求人・全候補者の合計</p>
      </div>

      <div className="p-6">
        <div className="flex items-center flex-wrap gap-1">
          {ordered.map((item, i) => {
            const prev = i > 0 ? ordered[i - 1].count : null
            const rate = prev !== null ? calcConversionRate(prev, item.count) : null
            const hasStale = item.stale_count > 0

            return (
              <div key={item.stage} className="flex items-center gap-1">
                {/* 矢印＋通過率 */}
                {i > 0 && (
                  <div className="flex flex-col items-center w-10 shrink-0">
                    <span className="text-xs text-gray-400 leading-none mb-0.5">{rate ?? '—'}</span>
                    <span className="text-gray-300 text-lg leading-none">›</span>
                  </div>
                )}

                {/* ステージカード */}
                <button
                  onClick={() => onStageClick?.(item.stage)}
                  className={[
                    'flex flex-col items-center rounded-lg border px-4 py-3 min-w-[80px] transition-all',
                    'hover:shadow-md hover:border-primary/50 cursor-pointer',
                    hasStale ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white',
                  ].join(' ')}
                >
                  <span className="text-2xl font-bold text-gray-900">{item.count}</span>
                  <span className="text-xs text-gray-600 mt-1 whitespace-nowrap">
                    {STAGE_LABELS[item.stage]}
                  </span>
                  {hasStale && (
                    <span className="mt-1 text-xs text-red-600 font-medium">
                      ⚠ {item.stale_count}件放置
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* 凡例 */}
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded border border-red-200 bg-red-50" />
            7日以上アクションなし
          </span>
          <span>各カードをクリックで候補者一覧を表示</span>
        </div>
      </div>
    </div>
  )
}
