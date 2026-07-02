import type { PulseTrendDirection, PulseTrendPoint } from './condition-summary'

/** 1on1テーマ定数（組み込みデフォルト） */
export const DEFAULT_THEMES = [
  '目標進捗確認',
  '悩み・困りごと相談',
  'キャリア・成長について',
  'ポジティブフィードバック',
  'フリートーク',
] as const

export type DefaultTheme = (typeof DEFAULT_THEMES)[number]

/** 1on1セッション記録 */
export interface OneOnOneSession {
  id: string
  tenant_id: string
  manager_id: string
  employee_id: string
  theme: string
  notes: string | null
  next_date: string | null // 'YYYY-MM-DD'
  conducted_at: string // ISO 8601
  created_at: string
}

/** テーマテンプレート */
export interface ThemeTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

/** 一覧表示用（従業員名・部署名付き） */
export interface SessionRow {
  id: string
  manager_id: string
  manager_name: string
  employee_id: string
  employee_name: string
  department_name: string | null
  theme: string
  notes: string | null
  next_date: string | null
  conducted_at: string
  /** 前回実施からの経過日数（null = 初回） */
  days_since_last: number | null
  ai_summary: string | null
}

/** 部署別・管理職別の実施率サマリー */
export interface ImplementationRateRow {
  manager_id: string
  manager_name: string
  department_name: string | null
  total_subordinates: number
  sessions_last_30days: number
  /** 実施率 0〜100 */
  rate: number
}

/** 部署別の実施率サマリー */
export interface DepartmentRateRow {
  division_id: string
  department_name: string
  total_subordinates: number
  sessions_last_30days: number
  /** 実施率 0〜100 */
  rate: number
}

/** ダッシュボードで表示する従業員（部下）情報 */
export interface OneOnOneEmployee {
  id: string
  name: string
  department_name: string | null
}

/** ダッシュボード全体データ */
export interface OneOnOneDashboardData {
  sessions: SessionRow[]
  implementationRates: ImplementationRateRow[]
  departmentRates: DepartmentRateRow[]
  themeTemplates: ThemeTemplate[]
  /** 未実施リマインダー対象（30日以上未実施の部下一覧） */
  overdueEmployees: OverdueEmployee[]
  totalSessionsLast30Days: number
  averageRate: number
}

/**
 * 1on1 を記録・管理できる権限かどうかを判定する（page.tsx / actions.ts 共通）。
 * テナント管理者ロール（employee 以外）または上長フラグ（is_manager）を持つユーザを許可する。
 * 管理画面レイアウト（(tenant-admin)/layout.tsx）が employee を遮断する前提と整合させる。
 */
export function canConductOneOnOne(
  appRole: string | null | undefined,
  isManager?: boolean | null
): boolean {
  return Boolean(isManager) || (appRole != null && appRole !== 'employee')
}

/** 参照パネル用の軽量 1on1 セッション */
export interface OneOnOneSessionSummary {
  id: string
  employee_id: string
  theme: string
  notes: string | null
  conducted_at: string
  manager_name: string
}

/** 未実施リマインダー対象 */
export interface OverdueEmployee {
  employee_id: string
  employee_name: string
  department_name: string | null
  manager_name: string
  last_session_at: string | null
  /** -1 = 一度も実施なし */
  days_overdue: number
}

/**
 * 1on1実施前のコンディションサマリー（パルスサーベイ推移・1on1実施状況）。
 * ストレスチェック・コンディションチェックイン個人データは上長への表示不可（RLS・既存製品判断）
 * のためスコープに含めない（docs/implementation-plan-1on1-condition-summary.md 参照）。
 */
export interface EmployeeConditionSummary {
  employeeId: string
  /** 古い→新しい順。直近3回分 */
  pulseTrend: PulseTrendPoint[]
  pulseTrendDirection: PulseTrendDirection
  lastOneOnOneAt: string | null
  daysSinceLastOneOnOne: number | null
  /** 30日以上未実施（または実施記録なし） */
  isOverdue: boolean
}

/** 予定中の 1on1（アジェンダ事前共有） */
export interface UpcomingOneOnOneRow {
  id: string
  manager_id: string
  manager_name: string
  employee_id: string
  employee_name: string
  scheduled_at: string
  theme: string
  agenda: string | null
  reminded_at: string | null
  status: 'scheduled' | 'cancelled' | 'completed'
}
