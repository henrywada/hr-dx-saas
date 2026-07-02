export type EngagementStatus = 'good' | 'caution' | 'alert'

export interface NewEngagementRecord {
  division_id: string
  composite_score: number
  status: EngagementStatus
}

export interface AlertTransition {
  division_id: string
  composite_score: number
  /** 遷移前のステータス。初回計算で以前のスナップショットが存在しない場合は 'none' */
  previous_status: EngagementStatus | 'none'
}

/**
 * 「alert 以外 → alert」への遷移のみを通知対象として抽出する。
 * alert が継続している場合や alert から回復した場合は対象外とし、通知疲れを防ぐ。
 * turnover-risk/transition-detector.ts の detectHighRiskTransitions と同じ設計。
 */
export function detectAlertTransitions(
  previousStatuses: Map<string, EngagementStatus>,
  newRecords: NewEngagementRecord[]
): AlertTransition[] {
  return newRecords
    .filter(record => record.status === 'alert')
    .filter(record => previousStatuses.get(record.division_id) !== 'alert')
    .map(record => ({
      division_id: record.division_id,
      composite_score: record.composite_score,
      previous_status: previousStatuses.get(record.division_id) ?? 'none',
    }))
}
