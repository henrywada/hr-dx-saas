/** ダッシュボード UI 表示制御の型 */

export type DashboardScreen = 'top' | 'adm'

export type DashboardElementType = 'card' | 'button' | 'section' | 'quick_access' | 'kpi' | 'notice'

export type UiDashboardElement = {
  id: string
  element_key: string
  screen: DashboardScreen
  element_type: DashboardElementType
  label: string
  description: string | null
  service_id: string | null
  sort_order: number
  is_active: boolean
}

export type TenantUiDashboardElement = {
  id: string
  tenant_id: string
  ui_dashboard_element_id: string
  is_visible: boolean
}

/** SaaS管理画面用: マスタ + テナントの表示状態 */
export type TenantDashboardUiRow = UiDashboardElement & {
  is_visible: boolean
}
