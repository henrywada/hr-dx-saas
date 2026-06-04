'use client'

import type { RiskLevel } from '../types'
import { RISK_LEVEL_LABELS } from '../types'

interface Props {
  level: RiskLevel
}

const COLOR_MAP: Record<RiskLevel, string> = {
  high: 'bg-red-100 text-red-700 ring-1 ring-red-300',
  medium: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300',
  low: 'bg-green-100 text-green-700 ring-1 ring-green-300',
}

export function RiskLevelBadge({ level }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_MAP[level]}`}
    >
      {RISK_LEVEL_LABELS[level]}
    </span>
  )
}
