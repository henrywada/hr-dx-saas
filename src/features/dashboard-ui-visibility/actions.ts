'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import type { TenantDashboardUiRow, UiDashboardElement } from './types'

function assertSaasAdmin(user: Awaited<ReturnType<typeof getServerUser>>) {
  if (!user || user.appRole !== 'developer') {
    throw new Error('Unauthorized: SaaS管理者のみ操作できます')
  }
}

/**
 * テナントのダッシュボード要素表示を設定する。
 * isVisible=true のときはオーバーライド行を削除（デフォルト表示に戻す）。
 * isVisible=false のときは upsert で明示非表示。
 */
export async function setTenantUiElementVisibility(
  tenantId: string,
  uiDashboardElementId: string,
  isVisible: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getServerUser()
    assertSaasAdmin(user)

    const supabase = createAdminClient()

    if (isVisible) {
      const { error } = await supabase
        .from('tenant_ui_dashboard_element')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('ui_dashboard_element_id', uiDashboardElementId)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase.from('tenant_ui_dashboard_element').upsert(
        {
          tenant_id: tenantId,
          ui_dashboard_element_id: uiDashboardElementId,
          is_visible: false,
          updated_by: user!.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,ui_dashboard_element_id' }
      )
      if (error) return { success: false, error: error.message }
    }

    revalidatePath('/saas_adm/system-master')
    revalidatePath('/top')
    revalidatePath('/adm')
    return { success: true }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, error: message }
  }
}

/** SaaS管理画面用: admin クライアントで全要素 + テナント表示状態を取得 */
export async function getTenantDashboardUiRows(tenantId: string): Promise<TenantDashboardUiRow[]> {
  const user = await getServerUser()
  assertSaasAdmin(user)

  const supabase = createAdminClient()

  const { data: elements, error: elErr } = await supabase
    .from('ui_dashboard_element')
    .select(
      'id, element_key, screen, element_type, label, description, service_id, sort_order, is_active'
    )
    .eq('is_active', true)
    .order('screen', { ascending: true })
    .order('sort_order', { ascending: true })

  if (elErr) {
    console.error('[dashboard-ui-visibility] getTenantDashboardUiRows', elErr)
    return []
  }

  const { data: overrides, error: ovErr } = await supabase
    .from('tenant_ui_dashboard_element')
    .select('ui_dashboard_element_id, is_visible')
    .eq('tenant_id', tenantId)

  if (ovErr) {
    console.error('[dashboard-ui-visibility] getTenantDashboardUiRows overrides', ovErr)
  }

  const overrideMap = new Map(
    (overrides ?? []).map(r => [r.ui_dashboard_element_id as string, r.is_visible as boolean])
  )

  return ((elements ?? []) as UiDashboardElement[]).map(el => ({
    ...el,
    is_visible: overrideMap.get(el.id) !== false,
  }))
}

/** SaaS管理画面初期表示用: 全アクティブ要素 */
export async function getAllUiDashboardElements(): Promise<UiDashboardElement[]> {
  const user = await getServerUser()
  assertSaasAdmin(user)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ui_dashboard_element')
    .select(
      'id, element_key, screen, element_type, label, description, service_id, sort_order, is_active'
    )
    .eq('is_active', true)
    .order('screen', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[dashboard-ui-visibility] getAllUiDashboardElements', error)
    return []
  }
  return (data ?? []) as UiDashboardElement[]
}

/** SaaS管理画面初期表示用: 全テナントのオーバーライド */
export async function getAllTenantUiDashboardElements(): Promise<
  { tenant_id: string; ui_dashboard_element_id: string; is_visible: boolean }[]
> {
  const user = await getServerUser()
  assertSaasAdmin(user)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenant_ui_dashboard_element')
    .select('tenant_id, ui_dashboard_element_id, is_visible')

  if (error) {
    console.error('[dashboard-ui-visibility] getAllTenantUiDashboardElements', error)
    return []
  }
  return data ?? []
}
