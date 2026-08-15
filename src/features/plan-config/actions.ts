'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { PLAN_CONFIG, type PlanType } from '@/features/signup/types'
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
