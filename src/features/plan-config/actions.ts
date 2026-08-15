'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { PLAN_CONFIG, type PlanType } from '@/features/signup/types'
import { getPlanConfig } from './queries'
import {
  mapDashboardUiCopyRows,
  mapTenantServiceCopyRows,
} from '@/features/signup/lib/copy-tenant-services'
import { canReplaceTenantServices, classifyServiceSync, isSyncTargetTenant } from './sync'
import type { PlanConfigUpdateInput } from './types'

function assertSaasAdmin(user: Awaited<ReturnType<typeof getServerUser>>) {
  if (!user || user.appRole !== 'developer') {
    throw new Error('Unauthorized: SaaS管理者のみ操作できます')
  }
}

export async function updatePlanConfig(
  planType: PlanType,
  input: PlanConfigUpdateInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getServerUser()
    assertSaasAdmin(user)

    if (!Object.hasOwn(PLAN_CONFIG, planType)) {
      return { success: false, error: '不明なプランです' }
    }
    if (!input.label.trim()) {
      return { success: false, error: '表示名は必須です' }
    }
    if (!Number.isInteger(input.maxEmployees) || input.maxEmployees < 1) {
      return { success: false, error: '最大従業員数は1以上の整数です' }
    }
    if (
      input.contractMonths != null &&
      (!Number.isInteger(input.contractMonths) || input.contractMonths < 1)
    ) {
      return { success: false, error: '契約月数は1以上の整数、または未設定です' }
    }
    if (!(['active', 'pending'] as const).includes(input.initialStatus)) {
      return { success: false, error: '初期状態が不正です' }
    }
    if (!(['free', 'card', 'bank_transfer'] as const).includes(input.paymentMethod)) {
      return { success: false, error: '決済方法が不正です' }
    }
    if (!(['paid', 'pending_transfer', 'unpaid'] as const).includes(input.paymentStatus)) {
      return { success: false, error: '決済状態が不正です' }
    }

    const supabase = createAdminClient()
    const { data: updated, error } = (await supabase
      .from('plan_config' as never)
      .update({
        label: input.label.trim(),
        max_employees: input.maxEmployees,
        initial_status: input.initialStatus,
        payment_method: input.paymentMethod,
        payment_status: input.paymentStatus,
        contract_months: input.contractMonths,
        available: input.available,
      } as never)
      .eq('plan_type' as never, planType)
      .select('plan_type')
      .maybeSingle()) as { data: { plan_type: string } | null; error: { message: string } | null }

    if (error) return { success: false, error: error.message }
    if (!updated) return { success: false, error: 'プラン設定が見つかりませんでした' }

    revalidatePath(APP_ROUTES.SAAS.SYSTEM_MASTER)
    revalidatePath(APP_ROUTES.AUTH.SIGNUP)
    return { success: true }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, error: message }
  }
}

/**
 * 同じ plan_type の既存テナントへ、保存済みプラン条件とテンプレート設定を反映する。
 * テンプレート自身は対象外。契約終了日・決済・稼働状態は変更しない。
 */
export async function syncPlanToExistingTenants(
  planType: PlanType
): Promise<{ success: boolean; tenantCount?: number; error?: string }> {
  try {
    const user = await getServerUser()
    assertSaasAdmin(user)

    if (!Object.hasOwn(PLAN_CONFIG, planType)) {
      return { success: false, error: '不明なプランです' }
    }

    const config = await getPlanConfig(planType)
    const supabase = createAdminClient()

    const { data: template, error: templateError } = await supabase
      .from('tenants')
      .select('id')
      .eq('name', config.templateTenantName)
      .eq('is_template', true)
      .maybeSingle()

    if (templateError) return { success: false, error: templateError.message }
    if (!template) {
      return {
        success: false,
        error: `テンプレートテナント「${config.templateTenantName}」が見つかりません`,
      }
    }

    const { data: templateServices, error: servicesError } = await supabase
      .from('tenant_service')
      .select('service_id, status')
      .eq('tenant_id', template.id)

    if (servicesError) return { success: false, error: servicesError.message }

    const templateServiceRows = (templateServices ?? []).filter(
      (row): row is { service_id: string; status: string | null } => Boolean(row.service_id)
    )
    if (!canReplaceTenantServices(templateServiceRows.length)) {
      return { success: false, error: 'テンプレートのサービスが0件のため同期できません' }
    }

    const { data: templateDashboard, error: dashboardError } = await supabase
      .from('tenant_ui_dashboard_element')
      .select('ui_dashboard_element_id, is_visible')
      .eq('tenant_id', template.id)

    if (dashboardError) return { success: false, error: dashboardError.message }

    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, plan_type, is_template')
      .eq('plan_type', planType)
      .eq('is_template', false)

    if (tenantsError) return { success: false, error: tenantsError.message }

    const targets = (tenants ?? []).filter(row => isSyncTargetTenant(row, planType))
    if (targets.length === 0) {
      return { success: true, tenantCount: 0 }
    }

    const startDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
    let updatedCount = 0
    const failPartial = (message: string) => ({
      success: false as const,
      tenantCount: updatedCount,
      error: updatedCount > 0 ? `${message}（${updatedCount}件まで反映済み）` : message,
    })

    for (const tenant of targets) {
      const { error: tenantUpdateError } = await supabase
        .from('tenants')
        .update({ max_employees: config.maxEmployees })
        .eq('id', tenant.id)
        .eq('is_template', false)
      if (tenantUpdateError) return failPartial(tenantUpdateError.message)

      const { error: contractUpdateError } = await supabase
        .from('tenant_contracts')
        .update({ max_employees: config.maxEmployees })
        .eq('tenant_id', tenant.id)
        .eq('plan_type', planType)
      if (contractUpdateError) return failPartial(contractUpdateError.message)

      const { data: currentServices, error: currentServicesError } = await supabase
        .from('tenant_service')
        .select('service_id, status')
        .eq('tenant_id', tenant.id)
      if (currentServicesError) return failPartial(currentServicesError.message)

      const currentRows = (currentServices ?? []).filter(
        (row): row is { service_id: string; status: string | null } => Boolean(row.service_id)
      )
      const diff = classifyServiceSync(currentRows, templateServiceRows)

      if (diff.toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('tenant_service')
          .delete()
          .eq('tenant_id', tenant.id)
          .in(
            'service_id',
            diff.toRemove.map(row => row.service_id)
          )
        if (deleteError) return failPartial(deleteError.message)
      }

      if (diff.toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('tenant_service')
          .insert(mapTenantServiceCopyRows(diff.toAdd, tenant.id, startDate))
        if (insertError) return failPartial(insertError.message)
      }

      if (diff.toUpdateStatus.length > 0) {
        const statusResults = await Promise.all(
          diff.toUpdateStatus.map(row =>
            supabase
              .from('tenant_service')
              .update({ status: row.status })
              .eq('tenant_id', tenant.id)
              .eq('service_id', row.service_id)
          )
        )
        const statusError = statusResults.find(result => result.error)?.error
        if (statusError) return failPartial(statusError.message)
      }

      const { error: deleteDashboardError } = await supabase
        .from('tenant_ui_dashboard_element')
        .delete()
        .eq('tenant_id', tenant.id)
      if (deleteDashboardError) return failPartial(deleteDashboardError.message)

      if (templateDashboard && templateDashboard.length > 0) {
        const { error: insertDashboardError } = await supabase
          .from('tenant_ui_dashboard_element')
          .insert(mapDashboardUiCopyRows(templateDashboard, tenant.id))
        if (insertDashboardError) return failPartial(insertDashboardError.message)
      }

      updatedCount += 1
    }

    revalidatePath(APP_ROUTES.SAAS.SYSTEM_MASTER)
    return { success: true, tenantCount: updatedCount }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, error: message }
  }
}
