'use client'

import { Medal } from 'lucide-react'
import type { ReferralRankingItem } from '../types'

interface ReferralRankingCardProps {
  ranking: ReferralRankingItem[]
}

/** 推薦件数ランキングカード（上位推薦者を表示） */
export function ReferralRankingCard({ ranking }: ReferralRankingCardProps) {
  if (ranking.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">推薦ランキング</h3>
        <p className="text-sm text-slate-400 text-center py-4">まだランキングデータがありません</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">推薦ランキング</h3>
      <ol className="space-y-3">
        {ranking.map((item, index) => {
          const rank = index + 1
          return (
            <li key={item.employee_id} className="flex items-center gap-3">
              {/* 順位表示（1〜3位はメダルカラー） */}
              <div className="flex-shrink-0 w-7 text-center">
                {rank === 1 ? (
                  <Medal className="h-5 w-5 text-yellow-400 mx-auto" aria-label="1位" />
                ) : rank === 2 ? (
                  <Medal className="h-5 w-5 text-slate-400 mx-auto" aria-label="2位" />
                ) : rank === 3 ? (
                  <Medal className="h-5 w-5 text-amber-600 mx-auto" aria-label="3位" />
                ) : (
                  <span className="text-sm font-medium text-slate-400">{rank}</span>
                )}
              </div>

              {/* 社員名 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{item.employee_name}</p>
              </div>

              {/* 推薦数・入社数バッジ */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-500">{item.total_nominations}件</span>
                {item.hired_count > 0 && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    入社 {item.hired_count}名
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
