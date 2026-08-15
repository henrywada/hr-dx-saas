import type { createAdminClient } from '@/lib/supabase/admin'
import { getPlanConfig } from '@/features/plan-config/queries'
import type { PlanType } from '../types'

type AdminClient = ReturnType<typeof createAdminClient>

type TemplateServiceRow = { service_id: string; status: string | null }
type TemplateDashboardRow = { ui_dashboard_element_id: string; is_visible: boolean }

/** 契約開始日付きの tenant_service INSERT 行を作る（テンプレートの start_date は使わない） */
export function mapTenantServiceCopyRows(
  services: TemplateServiceRow[],
  newTenantId: string,
  startDate: string
) {
  return services.map(s => ({
    tenant_id: newTenantId,
    service_id: s.service_id,
    status: s.status,
    start_date: startDate,
  }))
}

/** ダッシュボード表示オーバーライドの INSERT 行を作る */
export function mapDashboardUiCopyRows(rows: TemplateDashboardRow[], newTenantId: string) {
  return rows.map(r => ({
    tenant_id: newTenantId,
    ui_dashboard_element_id: r.ui_dashboard_element_id,
    is_visible: r.is_visible,
  }))
}

async function findTemplateTenantId(
  supabase: AdminClient,
  plan: PlanType,
  newTenantId: string
): Promise<string | null> {
  const templateName = (await getPlanConfig(plan)).templateTenantName
  const { data: template, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('name', templateName)
    .eq('is_template', true)
    .maybeSingle()

  if (error || !template) {
    console.warn(
      `[signup] テンプレート不在 tenant=${newTenantId} plan=${plan} template=${templateName}`,
      error ?? ''
    )
    return null
  }
  return template.id
}

/**
 * プラン別テンプレートの tenant_service を新規テナントへコピーする。
 * テンプレート不在・サービス0件・INSERT 失敗は非致命（警告ログのみ）。
 */
export async function copyTenantServicesFromTemplate(
  supabase: AdminClient,
  plan: PlanType,
  newTenantId: string,
  templateId?: string
): Promise<void> {
  const resolvedId = templateId ?? (await findTemplateTenantId(supabase, plan, newTenantId))
  if (!resolvedId) return

  const { data: services, error: servicesError } = await supabase
    .from('tenant_service')
    .select('service_id, status')
    .eq('tenant_id', resolvedId)

  if (servicesError || !services || services.length === 0) {
    console.warn(
      `[signup] tenant_serviceコピー失敗（テンプレートのサービスが0件） tenant=${newTenantId} plan=${plan}`,
      servicesError ?? ''
    )
    return
  }

  const startDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
  const { error: insertError } = await supabase
    .from('tenant_service')
    .insert(mapTenantServiceCopyRows(services, newTenantId, startDate))

  if (insertError) {
    console.warn(
      `[signup] tenant_serviceコピー失敗（INSERTエラー） tenant=${newTenantId} plan=${plan}`,
      insertError
    )
  }
}

/**
 * プラン別テンプレートの tenant_ui_dashboard_element を新規テナントへコピーする。
 * 行なしは「全要素表示」のデフォルトなので警告しない。INSERT 失敗のみ警告。
 */
export async function copyTenantDashboardUiFromTemplate(
  supabase: AdminClient,
  plan: PlanType,
  newTenantId: string,
  templateId?: string
): Promise<void> {
  const resolvedId = templateId ?? (await findTemplateTenantId(supabase, plan, newTenantId))
  if (!resolvedId) return

  const { data: rows, error: selectError } = await supabase
    .from('tenant_ui_dashboard_element')
    .select('ui_dashboard_element_id, is_visible')
    .eq('tenant_id', resolvedId)

  if (selectError) {
    console.warn(
      `[signup] dashboard UIコピー失敗（SELECTエラー） tenant=${newTenantId} plan=${plan}`,
      selectError
    )
    return
  }
  if (!rows || rows.length === 0) return

  const { error: insertError } = await supabase
    .from('tenant_ui_dashboard_element')
    .insert(mapDashboardUiCopyRows(rows, newTenantId))

  if (insertError) {
    console.warn(
      `[signup] dashboard UIコピー失敗（INSERTエラー） tenant=${newTenantId} plan=${plan}`,
      insertError
    )
  }
}

/**
 * サインアップ時: 有効サービスとダッシュボード表示設定をテンプレートからコピーする。
 * テンプレート検索は1回だけ行う。
 */
export async function copyPlanTemplateToNewTenant(
  supabase: AdminClient,
  plan: PlanType,
  newTenantId: string
): Promise<void> {
  const templateId = await findTemplateTenantId(supabase, plan, newTenantId)
  if (!templateId) return

  await Promise.all([
    copyTenantServicesFromTemplate(supabase, plan, newTenantId, templateId),
    copyTenantDashboardUiFromTemplate(supabase, plan, newTenantId, templateId),
  ])
}
