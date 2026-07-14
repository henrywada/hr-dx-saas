import { createClient } from '@/lib/supabase/server'
import type { DashboardScreen, TenantDashboardUiRow, UiDashboardElement } from './types'

/**
 * 指定画面で表示すべき element_key の集合を返す。
 * - service_id がある要素は tenant_service 契約が必要
 * - tenant_ui_dashboard_element.is_visible === false なら除外
 * - オーバーライド行なし / is_visible=true なら表示
 * - マスタ未整備・取得失敗時は null（呼び出し側は全表示扱い）
 */
export async function getVisibleDashboardElementKeys(
  tenantId: string | null | undefined,
  screen: DashboardScreen
): Promise<Set<string> | null> {
  if (!tenantId) return null

  const supabase = await createClient()

  const { data: elements, error: elErr } = await supabase
    .from('ui_dashboard_element')
    .select('id, element_key, service_id')
    .eq('screen', screen)
    .eq('is_active', true)

  if (elErr) {
    console.error('[dashboard-ui-visibility] getVisibleDashboardElementKeys elements', elErr)
    return null
  }

  const rows = (elements ?? []) as Pick<UiDashboardElement, 'id' | 'element_key' | 'service_id'>[]
  if (rows.length === 0) return null

  const serviceIds = [
    ...new Set(rows.map(r => r.service_id).filter((id): id is string => Boolean(id))),
  ]

  const [tsRes, ovRes] = await Promise.all([
    serviceIds.length > 0
      ? supabase
          .from('tenant_service')
          .select('service_id')
          .eq('tenant_id', tenantId)
          .in('service_id', serviceIds)
      : Promise.resolve({ data: [] as { service_id: string | null }[], error: null }),
    supabase
      .from('tenant_ui_dashboard_element')
      .select('ui_dashboard_element_id, is_visible')
      .eq('tenant_id', tenantId)
      .in(
        'ui_dashboard_element_id',
        rows.map(r => r.id)
      ),
  ])

  if (tsRes.error) {
    console.error('[dashboard-ui-visibility] tenant_service', tsRes.error)
  }
  if (ovRes.error) {
    console.error('[dashboard-ui-visibility] overrides', ovRes.error)
  }

  const contracted = new Set(
    (tsRes.data ?? []).map(r => r.service_id).filter((id): id is string => Boolean(id))
  )
  const overrideMap = new Map(
    (ovRes.data ?? []).map(r => [r.ui_dashboard_element_id as string, r.is_visible as boolean])
  )

  const visible = new Set<string>()
  for (const el of rows) {
    if (el.service_id != null && !contracted.has(el.service_id)) continue
    if (overrideMap.get(el.id) === false) continue
    visible.add(el.element_key)
  }
  return visible
}

/** 表示可否ヘルパー（null はマスタ未整備＝全表示） */
export function isDashboardElementVisible(
  visibleKeys: Set<string> | null,
  elementKey: string
): boolean {
  if (visibleKeys == null) return true
  return visibleKeys.has(elementKey)
}

/**
 * SaaS管理画面用: 全マスタ + 指定テナントの表示状態（行なし＝表示）
 */
export async function listDashboardElementsForTenant(
  tenantId: string
): Promise<TenantDashboardUiRow[]> {
  const supabase = await createClient()

  const { data: elements, error: elErr } = await supabase
    .from('ui_dashboard_element')
    .select(
      'id, element_key, screen, element_type, label, description, service_id, sort_order, is_active'
    )
    .eq('is_active', true)
    .order('screen', { ascending: true })
    .order('sort_order', { ascending: true })

  if (elErr) {
    console.error('[dashboard-ui-visibility] listDashboardElementsForTenant', elErr)
    return []
  }

  const { data: overrides, error: ovErr } = await supabase
    .from('tenant_ui_dashboard_element')
    .select('ui_dashboard_element_id, is_visible')
    .eq('tenant_id', tenantId)

  if (ovErr) {
    console.error('[dashboard-ui-visibility] list overrides', ovErr)
  }

  const overrideMap = new Map(
    (overrides ?? []).map(r => [r.ui_dashboard_element_id as string, r.is_visible as boolean])
  )

  return ((elements ?? []) as UiDashboardElement[]).map(el => ({
    ...el,
    is_visible: overrideMap.get(el.id) !== false,
  }))
}
