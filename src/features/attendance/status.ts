import type { AttendanceStatusTier } from './types'

const M45 = 45 * 60
const M60 = 60 * 60
const M80 = 80 * 60

/**
 * 当月残業（分）と法令リスクフラグから UI ステータス tier を決定
 * - 危険: 残業80h以上、または法令違反リスク該当
 */
export function getAttendanceStatusTier(
  overtimeMinutes: number,
  legalRisk: boolean,
): AttendanceStatusTier {
  if (legalRisk || overtimeMinutes >= M80) {
    return 'danger'
  }
  if (overtimeMinutes >= M60) {
    return 'warning'
  }
  if (overtimeMinutes >= M45) {
    return 'caution'
  }
  return 'normal'
}

export function statusTierSortRank(tier: AttendanceStatusTier): number {
  switch (tier) {
    case 'danger':
      return 4
    case 'warning':
      return 3
    case 'caution':
      return 2
    default:
      return 1
  }
}

export const STATUS_TIER_LABEL: Record<AttendanceStatusTier, string> = {
  normal: '正常',
  caution: '注意',
  warning: '警告',
  danger: '危険',
}
