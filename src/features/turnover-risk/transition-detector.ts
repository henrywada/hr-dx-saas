import type { RiskLevel } from './types'

export interface NewRiskRecord {
  employee_id: string
  risk_score: number
  risk_level: RiskLevel
}

export interface HighRiskTransition {
  employee_id: string
  risk_score: number
  /** 遷移前のリスクレベル。初回計算で以前のスナップショットが存在しない場合は 'none' */
  previous_risk_level: RiskLevel | 'none'
}

/**
 * 「high 以外 → high」への遷移のみを通知対象として抽出する。
 * high が継続している場合や high から回復した場合は対象外とし、通知疲れを防ぐ。
 */
export function detectHighRiskTransitions(
  previousLevels: Map<string, RiskLevel>,
  newRecords: NewRiskRecord[]
): HighRiskTransition[] {
  return newRecords
    .filter(record => record.risk_level === 'high')
    .filter(record => previousLevels.get(record.employee_id) !== 'high')
    .map(record => ({
      employee_id: record.employee_id,
      risk_score: record.risk_score,
      previous_risk_level: previousLevels.get(record.employee_id) ?? 'none',
    }))
}
