'use client'

import { Badge } from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'

/** monthly_overtime_closures.status 向けラベル・配色 */
export function closureStatusLabel(status: string | null | undefined): string {
  const s = status ?? 'open'
  switch (s) {
    case 'open':
      return '未完了'
    case 'aggregated':
      return '集計済'
    case 'approved':
      return '承認済'
    case 'locked':
      return 'ロック済'
    default:
      return s
  }
}

export function closureStatusVariant(status: string | null | undefined): BadgeVariant {
  const s = status ?? 'open'
  switch (s) {
    case 'open':
      return 'neutral'
    case 'aggregated':
      return 'teal'
    case 'approved':
      return 'primary'
    case 'locked':
      return 'orange'
    default:
      return 'neutral'
  }
}

type Props = {
  status: string | null | undefined
  className?: string
}

export function ClosureStatusBadge({ status, className }: Props) {
  return (
    <Badge variant={closureStatusVariant(status)} className={className}>
      {closureStatusLabel(status)}
    </Badge>
  )
}
