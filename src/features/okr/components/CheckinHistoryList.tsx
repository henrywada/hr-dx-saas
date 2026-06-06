'use client'

import { CONFIDENCE_LABELS } from '../types'
import type { Checkin } from '../types'

interface Props {
  checkins: Checkin[]
}

export function CheckinHistoryList({ checkins }: Props) {
  if (checkins.length === 0) {
    return <p className="text-xs text-gray-400 py-2">チェックイン履歴がありません</p>
  }

  return (
    <div className="space-y-2">
      {checkins.map(c => (
        <div key={c.id} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
          <div className="flex-shrink-0 text-center min-w-[40px]">
            <span className="text-sm font-bold text-gray-900">{c.confidence}</span>
            <p className="text-xs text-gray-500">{CONFIDENCE_LABELS[c.confidence]}</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs text-gray-500">{c.checkin_date}</span>
              {c.current_value != null && (
                <span className="text-xs font-medium text-gray-700">現在値: {c.current_value}</span>
              )}
            </div>
            {c.comment && <p className="text-xs text-gray-700 leading-relaxed">{c.comment}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
