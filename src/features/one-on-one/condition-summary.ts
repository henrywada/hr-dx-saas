export type PulseTrendDirection = 'up' | 'down' | 'flat' | 'no_data'

export interface PulseTrendPoint {
  period: string
  score: number
}

/**
 * パルスサーベイの推移から傾向を判定する。
 * trend は古い→新しい順（先頭が最古）で渡すこと。
 */
export function computePulseTrendDirection(trend: PulseTrendPoint[]): PulseTrendDirection {
  if (trend.length === 0) return 'no_data'
  if (trend.length === 1) return 'flat'

  const first = trend[0].score
  const last = trend[trend.length - 1].score
  if (last > first) return 'up'
  if (last < first) return 'down'
  return 'flat'
}

/** 1on1が30日以上未実施（または実施記録なし）かどうかを判定する */
export function isOneOnOneOverdue(daysSinceLastOneOnOne: number | null): boolean {
  return daysSinceLastOneOnOne === null || daysSinceLastOneOnOne >= 30
}
