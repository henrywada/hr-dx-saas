'use client'

import type { NominationStatus } from '../types'
import { NOMINATION_STATUS_LABELS } from '../types'

interface ReferralStatusBadgeProps {
  status: NominationStatus
}

/** 推薦ステータスに応じたバッジを表示する */
export function ReferralStatusBadge({ status }: ReferralStatusBadgeProps) {
  const colorClass = getColorClass(status)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {NOMINATION_STATUS_LABELS[status]}
    </span>
  )
}

function getColorClass(status: NominationStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-700'
    case 'reviewing':
    case 'interview':
      return 'bg-blue-100 text-blue-700'
    case 'offered':
      return 'bg-purple-100 text-purple-700'
    case 'hired':
      return 'bg-green-100 text-green-700'
    case 'rejected':
    case 'withdrawn':
      return 'bg-slate-100 text-slate-500'
    default:
      return 'bg-slate-100 text-slate-500'
  }
}
