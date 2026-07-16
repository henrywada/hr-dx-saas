import type { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_CONFIG, type PlanType } from '../types'

/**
 * プラン別テンプレートテナント（tenants.is_template = true）の tenant_service を
 * 新規テナントへコピーする。
 *
 * テンプレート不在・サービス0件・INSERT 失敗は非致命扱い（警告ログのみ）とし、
 * サインアップ自体は続行させる。テンプレート未設定という運用ミスで新規申込を
 * 失敗させないため。未付与のサービスはシステムマスタ画面から後付けできる。
 *
 * 注: tenant_service.tenant_id は ON DELETE CASCADE のため、呼び出し元で
 * tenants をロールバック削除すればコピー済み行も自動削除される。
 */
export async function copyTenantServicesFromTemplate(
  supabase: ReturnType<typeof createAdminClient>,
  plan: PlanType,
  newTenantId: string
): Promise<void> {
  const templateName = PLAN_CONFIG[plan].templateTenantName

  const { data: template, error: templateError } = await supabase
    .from('tenants')
    .select('id')
    .eq('name', templateName)
    .eq('is_template', true)
    .maybeSingle()

  if (templateError || !template) {
    console.warn(
      `[signup] tenant_serviceコピー失敗（テンプレート不在） tenant=${newTenantId} plan=${plan} template=${templateName}`,
      templateError ?? ''
    )
    return
  }

  const { data: services, error: servicesError } = await supabase
    .from('tenant_service')
    .select('service_id, status')
    .eq('tenant_id', template.id)

  if (servicesError || !services || services.length === 0) {
    console.warn(
      `[signup] tenant_serviceコピー失敗（テンプレートのサービスが0件） tenant=${newTenantId} plan=${plan} template=${templateName}`,
      servicesError ?? ''
    )
    return
  }

  // 契約開始日 = 当日（Asia/Tokyo）。テンプレートの start_date はコピーしない
  const startDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })

  const { error: insertError } = await supabase.from('tenant_service').insert(
    services.map(s => ({
      tenant_id: newTenantId,
      service_id: s.service_id,
      status: s.status,
      start_date: startDate,
    }))
  )

  if (insertError) {
    console.warn(
      `[signup] tenant_serviceコピー失敗（INSERTエラー） tenant=${newTenantId} plan=${plan}`,
      insertError
    )
  }
}
