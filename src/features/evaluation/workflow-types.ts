import type { FlowStatus, EvaluationPeriod } from './types'

/** フェーズ別の集計サマリー */
export type PhaseCount = {
  status: FlowStatus
  count: number
  label: string
  color: string
}

/** 未提出者情報（催促対象） */
export type PendingEmployee = {
  sheet_id: string
  employee_id: string
  employee_name: string
  employee_code: string | null
  division_path: string | null
  flow_status: FlowStatus
  /** 現在のフェーズの期限日（evaluation_periods から算出） */
  phase_deadline: string | null
  /** 期限超過日数（負 = 超過、0以上 = 残日数） */
  days_remaining: number | null
  /** 最後に催促を送った日時 */
  last_reminder_at: string | null
}

/** リマインダー履歴 */
export type ReminderRecord = {
  id: string
  sheet_id: string
  employee_name: string
  reminder_type: 'deadline_approaching' | 'overdue' | 'bulk_nudge' | 'rollback_notify'
  message: string | null
  target_status: string | null
  sent_by_name: string
  sent_at: string
}

/** ワークフローダッシュボードの初期データ */
export type WorkflowDashboardData = {
  period: EvaluationPeriod
  phaseCounts: PhaseCount[]
  pendingEmployees: PendingEmployee[]
}
