'use client'

import { ReactNode, useState } from 'react'
import {
  DoctorQueueTable,
  type DoctorQueueRow,
} from '@/features/health-check/components/DoctorQueueTable'

type QueueFilter = 'all' | 'pending' | 'judged'

const FILTER_OPTIONS: { value: QueueFilter; label: string }[] = [
  { value: 'all', label: '全て' },
  { value: 'pending', label: '未判定のみ' },
  { value: 'judged', label: '判定済のみ' },
]

const TABLE_TITLE: Record<QueueFilter, string> = {
  all: '産業医 判定キュー（全て）',
  pending: '産業医 未判定',
  judged: '産業医 判定済',
}

export function DoctorQueueSection({
  pending,
  judged,
  bulkActionSlot,
}: {
  pending: DoctorQueueRow[]
  judged: DoctorQueueRow[]
  bulkActionSlot?: ReactNode
}) {
  const [filter, setFilter] = useState<QueueFilter>('all')

  const rows =
    filter === 'pending' ? pending : filter === 'judged' ? judged : [...pending, ...judged]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-[10px] text-slate-500">標準値は詳細で確認します。</p>
          <div className="flex items-center gap-3 text-xs text-slate-700">
            {FILTER_OPTIONS.map(option => (
              <label key={option.value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="doctor-queue-filter"
                  value={option.value}
                  checked={filter === option.value}
                  onChange={() => setFilter(option.value)}
                  className="accent-(--brand)"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        {bulkActionSlot}
      </div>
      <DoctorQueueTable title={TABLE_TITLE[filter]} rows={rows} />
    </div>
  )
}
