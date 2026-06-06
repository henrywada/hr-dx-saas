export type ObjectiveOwnerType = 'company' | 'division' | 'employee'

export const OBJECTIVE_OWNER_TYPE_LABELS: Record<ObjectiveOwnerType, string> = {
  company: '会社',
  division: '部門',
  employee: '個人',
}

export type ObjectiveStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  draft: '下書き',
  active: '進行中',
  completed: '達成',
  cancelled: '中止',
}

export const OBJECTIVE_STATUS_COLORS: Record<ObjectiveStatus, string> = {
  draft: 'text-gray-600 bg-gray-100',
  active: 'text-blue-600 bg-blue-50',
  completed: 'text-green-600 bg-green-50',
  cancelled: 'text-gray-500 bg-gray-50',
}

export type KeyResultStatus = 'on_track' | 'at_risk' | 'off_track' | 'completed' | 'cancelled'

export const KEY_RESULT_STATUS_LABELS: Record<KeyResultStatus, string> = {
  on_track: '順調',
  at_risk: '要注意',
  off_track: '遅延',
  completed: '達成',
  cancelled: '中止',
}

export const KEY_RESULT_STATUS_COLORS: Record<KeyResultStatus, string> = {
  on_track: 'text-green-600 bg-green-50',
  at_risk: 'text-yellow-600 bg-yellow-50',
  off_track: 'text-red-600 bg-red-50',
  completed: 'text-blue-600 bg-blue-50',
  cancelled: 'text-gray-500 bg-gray-50',
}

export const CONFIDENCE_LABELS: Record<number, string> = {
  1: '厳しい',
  2: '難しい',
  3: '普通',
  4: '良好',
  5: '達成確実',
}

export interface Objective {
  id: string
  tenant_id: string
  parent_id: string | null
  owner_type: ObjectiveOwnerType
  owner_employee_id: string | null
  owner_division_id: string | null
  period_label: string
  fiscal_year: number
  half_year: 'first' | 'second' | null
  title: string
  description: string | null
  status: ObjectiveStatus
  progress: number
  sort_order: number
  evaluation_sheet_id: string | null
  approved_at: string | null
  approved_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface KeyResult {
  id: string
  tenant_id: string
  objective_id: string
  title: string
  description: string | null
  kr_type: 'quantitative' | 'qualitative'
  target_value: number | null
  current_value: number
  unit: string | null
  start_value: number
  progress: number
  weight: number
  due_date: string | null
  status: KeyResultStatus
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Checkin {
  id: string
  tenant_id: string
  key_result_id: string
  employee_id: string
  confidence: number
  current_value: number | null
  comment: string | null
  checkin_date: string
  created_at: string
}

export interface ObjectiveWithDetails extends Objective {
  key_results: KeyResultWithCheckins[]
  children: ObjectiveWithDetails[]
  owner_name: string | null
}

export interface KeyResultWithCheckins extends KeyResult {
  latest_checkin: Checkin | null
  checkin_count: number
  checkins: Checkin[]
}

export interface OkrDashboardData {
  companyObjectives: ObjectiveWithDetails[]
  divisionObjectives: ObjectiveWithDetails[]
  myObjectives: ObjectiveWithDetails[]
  teamObjectives: ObjectiveWithDetails[]
  summary: OkrSummary
  divisions: { id: string; name: string }[]
}

export interface OkrSummary {
  totalObjectives: number
  activeObjectives: number
  completedObjectives: number
  averageProgress: number
  totalKeyResults: number
}

export interface DivisionAchievementRow {
  division_id: string
  division_name: string
  avg_progress: number
  objective_count: number
}

export type OkrActionResult = { success: true; id?: string } | { success: false; error: string }
