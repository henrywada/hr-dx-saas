'use client'

import type { RewardStatus } from '../types'
import { REWARD_STATUS_LABELS } from '../types'

interface RewardStatusBadgeProps {
  status: RewardStatus
}

/** 報奨金支払いステータスに応じたバッジを表示する */
export function RewardStatusBadge({ status }: RewardStatusBadgeProps) {
  const colorClass = getColorClass(status)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {REWARD_STATUS_LABELS[status]}
    </span>
  )
}

function getColorClass(status: RewardStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-700'
    case 'approved':
      return 'bg-[#FD7601]-10 text-[#FD7601]'
    case 'paid':
      return 'bg-green-100 text-green-700'
    case 'cancelled':
      return 'bg-[#f6f8fa] text-[#57606a]'
    default:
      return 'bg-[#f6f8fa] text-[#57606a]'
  }
}
