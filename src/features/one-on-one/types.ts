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

/** ダッシュボード全体データ */
export interface OneOnOneDashboardData {
  sessions: SessionRow[]
  implementationRates: ImplementationRateRow[]
  themeTemplates: ThemeTemplate[]
  /** 未実施リマインダー対象（30日以上未実施の部下一覧） */
  overdueEmployees: OverdueEmployee[]
  totalSessionsLast30Days: number
  averageRate: number
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
