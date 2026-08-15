import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_CONFIG, type PlanType } from '@/features/signup/types'
import { isSyncTargetTenant } from './sync'
import type { PlanConfigRow } from './types'

const PLAN_ORDER: PlanType[] = ['free', 'plan100', 'plan300', 'plan500', 'plan1000']

function fromCodeDefault(plan: PlanType): PlanConfigRow {
  const d = PLAN_CONFIG[plan]
  return {
    planType: plan,
    label: d.label,
    maxEmployees: d.maxEmployees,
    initialStatus: d.initialStatus,
    paymentMethod: d.paymentMethod,
    paymentStatus: d.paymentStatus,
    contractMonths: d.contractMonths,
    available: d.available,
    templateTenantName: d.templateTenantName,
    stripePriceIdEnv: d.stripePriceIdEnv,
  }
}

function fromDbRow(row: {
  plan_type: string
  label: string
  max_employees: number
  initial_status: string
  payment_method: string
  payment_status: string
  contract_months: number | null
  available: boolean
  template_tenant_name: string
  stripe_price_id_env: string | null
}): PlanConfigRow | null {
  if (!Object.hasOwn(PLAN_CONFIG, row.plan_type)) return null
  const plan = row.plan_type as PlanType
  const fallback = PLAN_CONFIG[plan]
  return {
    planType: plan,
    label: row.label,
    maxEmployees: row.max_employees,
    initialStatus: row.initial_status as PlanConfigRow['initialStatus'],
    paymentMethod: row.payment_method as PlanConfigRow['paymentMethod'],
    paymentStatus: row.payment_status as PlanConfigRow['paymentStatus'],
    contractMonths: row.contract_months,
    available: row.available,
    templateTenantName: row.template_tenant_name || fallback.templateTenantName,
    stripePriceIdEnv: row.stripe_price_id_env ?? fallback.stripePriceIdEnv,
  }
}

/** 全プラン条件。DB未整備時はコードの PLAN_CONFIG にフォールバック */
export async function getAllPlanConfigs(): Promise<PlanConfigRow[]> {
  const supabase = createAdminClient()
  const { data, error } = (await supabase
    .from('plan_config' as never)
    .select(
      'plan_type, label, max_employees, initial_status, payment_method, payment_status, contract_months, available, template_tenant_name, stripe_price_id_env'
    )
    .order('sort_order', { ascending: true })) as {
    data: Array<{
      plan_type: string
      label: string
      max_employees: number
      initial_status: string
      payment_method: string
      payment_status: string
      contract_months: number | null
      available: boolean
      template_tenant_name: string
      stripe_price_id_env: string | null
    }> | null
    error: { message: string } | null
  }

  if (error || !data || data.length === 0) {
    if (error) console.error('getAllPlanConfigs error:', error)
    return PLAN_ORDER.map(fromCodeDefault)
  }

  const mapped = data.map(fromDbRow).filter((r): r is PlanConfigRow => r != null)
  const have = new Set(mapped.map(r => r.planType))
  for (const plan of PLAN_ORDER) {
    if (!have.has(plan)) mapped.push(fromCodeDefault(plan))
  }
  mapped.sort((a, b) => PLAN_ORDER.indexOf(a.planType) - PLAN_ORDER.indexOf(b.planType))
  return mapped
}

export async function getPlanConfig(plan: PlanType): Promise<PlanConfigRow> {
  const all = await getAllPlanConfigs()
  return all.find(r => r.planType === plan) ?? fromCodeDefault(plan)
}

function emptyTenantCounts(): Record<PlanType, number> {
  return Object.fromEntries(PLAN_ORDER.map(plan => [plan, 0])) as Record<PlanType, number>
}

/** テンプレートを除く、プラン別の既存テナント件数 */
export async function getExistingTenantCountsByPlan(): Promise<Record<PlanType, number>> {
  const counts = emptyTenantCounts()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('plan_type, is_template')
    .eq('is_template', false)

  if (error || !data) {
    if (error) console.error('getExistingTenantCountsByPlan error:', error)
    return counts
  }

  for (const row of data) {
    if (!Object.hasOwn(PLAN_CONFIG, row.plan_type)) continue
    if (!isSyncTargetTenant(row, row.plan_type)) continue
    counts[row.plan_type as PlanType] += 1
  }
  return counts
}
