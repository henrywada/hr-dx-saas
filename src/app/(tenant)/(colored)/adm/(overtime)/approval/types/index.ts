/**
 * 残業申請一覧（上長・同一部署承認）画面の型定義と API 契約
 */

import type { AppUser } from '@/types/auth'

/** DB / 画面共通の承認ステータス（一覧のプレースホルダ行用に「未申請」を含む） */
export type OvertimeApplicationStatus =
  | '申請中'
  | '承認済'
  | '却下'
  | '修正依頼'
  | '未申請'

/** 勤怠ソース（API 応答・フィルタ用。勤怠レコード由来） */
export type OvertimeApplicationSource = 'csv' | 'manual'

/** 一覧・詳細で扱う残業申請 */
export type OvertimeApplication = {
  id: string
  tenant_id: string
  employee_id: string
  employee_name?: string
  /** 一覧ソート・表示用（employees.employee_no） */
  employee_no?: string | null
  work_date: string
  clock_in?: string
  clock_out?: string
  is_holiday?: boolean
  overtime_start?: string
  overtime_end?: string
  requested_hours?: number
  reason?: string
  source?: OvertimeApplicationSource
  status: OvertimeApplicationStatus
  created_at?: string
  updated_at?: string
  /** 承認・却下・修正依頼時に上長が入力したコメント */
  supervisor_comment?: string | null
}

/** GET /api/overtime/applications のクエリ（画面 lib/api と API ルートで共有する概念） */
export type FetchApplicationsQuery = {
  tenant_id: string
  month: string
  page?: number
  limit?: number
  /** 複数ステータス */
  status?: OvertimeApplicationStatus[]
  /** 同一部署の全員を行に含める（該当申請がないメンバーは「未申請」1行） */
  all_division_employees?: boolean
}

/** 一覧 API が返す閾値（overtime_settings または労基法デフォルト） */
export type OvertimeListThresholdSource = 'tenant_settings' | 'legal_default'

export type OvertimeListThresholds = {
  monthly_limit_hours: number
  monthly_warning_hours: number
  annual_limit_hours: number
  average_limit_hours: number
  source: OvertimeListThresholdSource
}

/** 従業員別ワーニング（warn / limit のみ載る。未該当 id は応答にキーなし） */
export type EmployeeOvertimeWarningPayload = {
  level: 'warn' | 'limit'
  reasons: string[]
}

/** 注意列表示用（当該ページに出ている従業員 id のみ） */
export type EmployeeOvertimeAggPayload = {
  /** 当月・承認済+申請中+修正依頼の requested_hours 合計 */
  monthly_requested: number
  /** 当年（暦年）・承認済のみの合計 */
  ytd_approved: number
}

/** GET /api/overtime/applications の JSON 応答 */
export type OvertimeApplicationsListResponse = {
  items: OvertimeApplication[]
  total: number
  page: number
  limit: number
  /** 選択月・同一部署メンバーの「承認済」申請の requested_hours 合計（一覧のステータスフィルタとは独立） */
  month_approved_hours_total?: number
  /** 選択月・同一部署の「承認済」以外の requested_hours 合計（一覧のステータスフィルタとは独立） */
  month_unapproved_hours_total?: number
  overtime_thresholds?: OvertimeListThresholds
  employee_overtime_warnings?: Record<string, EmployeeOvertimeWarningPayload>
  /** 当該ページの行に含まれる従業員のみ（閾値判定と同じ集計定義） */
  employee_overtime_aggs?: Record<string, EmployeeOvertimeAggPayload>
}

/** POST .../approve | .../reject のボディ */
export type OvertimeDecisionBody = {
  supervisor_id: string
  comment?: string
}

/** POST .../request_correction のボディ */
export type OvertimeRequestCorrectionBody = {
  supervisor_id: string
  comment: string
  suggested_hours?: number
}

/** 承認・却下・修正依頼 API の成功応答（最小） */
export type OvertimeDecisionResponse = {
  id: string
  status: OvertimeApplicationStatus
}

/** 承認対象モーダル用（同一部署の従業員） */
export type OvertimeApprovalTargetPeer = {
  id: string
  name: string
  employee_no: string | null
}

/** is_manager かつ部署割当がある場合のみ承認操作可 */
export function canApproveOvertimeInDivision(
  user: Pick<AppUser, 'is_manager' | 'division_id'>,
): boolean {
  return user.is_manager === true && Boolean(user.division_id)
}
