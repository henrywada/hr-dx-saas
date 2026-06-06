'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { APP_ROUTES } from '@/config/routes'
import { calcKrProgress, calcObjectiveProgress } from './queries'
import type { OkrActionResult, KeyResult } from './types'

const ADMIN_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']
const MANAGER_ROLES = ['manager', 'hr_manager', 'tenant_admin', 'developer']

const createObjectiveSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  owner_type: z.enum(['company', 'division', 'employee']),
  owner_employee_id: z.string().uuid().nullable().optional(),
  owner_division_id: z.string().uuid().nullable().optional(),
  fiscal_year: z.number().int().min(2020).max(2100),
  half_year: z.enum(['first', 'second']).nullable().optional(),
  period_label: z.string().min(1).max(20),
  title: z.string().min(1, '目標タイトルは必須です').max(200),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
})

const updateObjectiveSchema = createObjectiveSchema.extend({
  sort_order: z.number().int().min(0).optional(),
  progress: z.number().min(0).max(100).optional(),
})

const createKeyResultSchema = z.object({
  objective_id: z.string().uuid(),
  title: z.string().min(1, 'KRタイトルは必須です').max(200),
  description: z.string().max(2000).nullable().optional(),
  kr_type: z.enum(['quantitative', 'qualitative']),
  target_value: z.number().nullable().optional(),
  start_value: z.number().default(0),
  unit: z.string().max(20).nullable().optional(),
  weight: z.number().min(0).max(100).default(100),
  due_date: z.string().nullable().optional(),
})

const submitCheckinSchema = z.object({
  key_result_id: z.string().uuid(),
  confidence: z.number().int().min(1).max(5),
  current_value: z.number().nullable().optional(),
  comment: z.string().max(1000).nullable().optional(),
  checkin_date: z.string(),
})

/** 目標を新規作成する */
export async function createObjective(
  input: z.infer<typeof createObjectiveSchema>
): Promise<OkrActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '認証エラー' }
  if (!ADMIN_ROLES.includes(user.appRole ?? ''))
    return { success: false, error: '権限がありません' }

  const parsed = createObjectiveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('objectives')
    .insert({
      ...parsed.data,
      tenant_id: user.tenant_id,
      created_by: user.employee_id,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_OKR_DASHBOARD)
  return { success: true, id: data.id }
}

/** 目標を更新する */
export async function updateObjective(
  objectiveId: string,
  input: z.infer<typeof updateObjectiveSchema>
): Promise<OkrActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!ADMIN_ROLES.includes(user.appRole ?? ''))
    return { success: false, error: '権限がありません' }

  const parsed = updateObjectiveSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('objectives')
    .update(parsed.data)
    .eq('id', objectiveId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_OKR_DASHBOARD)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_OKR_DETAIL(objectiveId))
  return { success: true }
}

/** 目標を削除する（KR・チェックインは CASCADE で削除される）*/
export async function deleteObjective(objectiveId: string): Promise<OkrActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!ADMIN_ROLES.includes(user.appRole ?? ''))
    return { success: false, error: '権限がありません' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('objectives')
    .delete()
    .eq('id', objectiveId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_OKR_DASHBOARD)
  return { success: true }
}

/** 目標を承認する */
export async function approveObjective(objectiveId: string): Promise<OkrActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '認証エラー' }
  if (!MANAGER_ROLES.includes(user.appRole ?? ''))
    return { success: false, error: '権限がありません' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('objectives')
    .update({
      approved_at: new Date().toISOString(),
      approved_by: user.employee_id,
      status: 'active',
    })
    .eq('id', objectiveId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_OKR_DETAIL(objectiveId))
  return { success: true }
}

/** KRを新規作成する */
export async function createKeyResult(
  input: z.infer<typeof createKeyResultSchema>
): Promise<OkrActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '認証エラー' }
  if (!ADMIN_ROLES.includes(user.appRole ?? ''))
    return { success: false, error: '権限がありません' }

  const parsed = createKeyResultSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('key_results')
    .insert({
      ...parsed.data,
      tenant_id: user.tenant_id,
      created_by: user.employee_id,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_OKR_DETAIL(parsed.data.objective_id))
  return { success: true, id: data.id }
}

/** KRを更新する */
export async function updateKeyResult(
  keyResultId: string,
  input: Partial<z.infer<typeof createKeyResultSchema>>
): Promise<OkrActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!ADMIN_ROLES.includes(user.appRole ?? ''))
    return { success: false, error: '権限がありません' }

  const supabase = await createClient()
  const { data: existing, error: fetchError } = await supabase
    .from('key_results')
    .select('objective_id')
    .eq('id', keyResultId)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (fetchError || !existing) return { success: false, error: 'KRが見つかりません' }

  const { error } = await supabase
    .from('key_results')
    .update(input)
    .eq('id', keyResultId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_OKR_DETAIL(existing.objective_id))
  return { success: true }
}

/** KRを削除する */
export async function deleteKeyResult(keyResultId: string): Promise<OkrActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!ADMIN_ROLES.includes(user.appRole ?? ''))
    return { success: false, error: '権限がありません' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('key_results')
    .select('objective_id')
    .eq('id', keyResultId)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!existing) return { success: false, error: 'KRが見つかりません' }

  const { error } = await supabase
    .from('key_results')
    .delete()
    .eq('id', keyResultId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_OKR_DETAIL(existing.objective_id))
  return { success: true }
}

/**
 * チェックインを記録し、KRとObjectiveの進捗を自動更新する
 * 定量KRの場合は current_value から progress を再計算する
 */
export async function submitCheckin(
  input: z.infer<typeof submitCheckinSchema>
): Promise<OkrActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '認証エラー' }

  const parsed = submitCheckinSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.message }

  const supabase = await createClient()

  const { data: kr, error: krError } = await supabase
    .from('key_results')
    .select('*')
    .eq('id', parsed.data.key_result_id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (krError || !kr) return { success: false, error: 'KRが見つかりません' }

  const { error: checkinError } = await supabase.from('checkins').insert({
    tenant_id: user.tenant_id,
    key_result_id: parsed.data.key_result_id,
    employee_id: user.employee_id,
    confidence: parsed.data.confidence,
    current_value: parsed.data.current_value ?? null,
    comment: parsed.data.comment ?? null,
    checkin_date: parsed.data.checkin_date,
  })

  if (checkinError) return { success: false, error: checkinError.message }

  // 定量KRの場合は current_value から progress を再計算する
  if (kr.kr_type === 'quantitative' && parsed.data.current_value != null) {
    const newProgress = calcKrProgress(
      kr.start_value ?? 0,
      parsed.data.current_value,
      kr.target_value ?? 100
    )
    await supabase
      .from('key_results')
      .update({ current_value: parsed.data.current_value, progress: newProgress })
      .eq('id', kr.id)
      .eq('tenant_id', user.tenant_id)

    // Objectiveの進捗を全KRの加重平均で再計算する
    const { data: allKrs } = await supabase
      .from('key_results')
      .select('*')
      .eq('objective_id', kr.objective_id)
      .eq('tenant_id', user.tenant_id)

    if (allKrs && allKrs.length > 0) {
      const updatedKrs = allKrs.map(k => (k.id === kr.id ? { ...k, progress: newProgress } : k))
      const newObjProgress = calcObjectiveProgress(updatedKrs as KeyResult[])
      await supabase
        .from('objectives')
        .update({ progress: newObjProgress })
        .eq('id', kr.objective_id)
        .eq('tenant_id', user.tenant_id)
    }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_OKR_DETAIL(kr.objective_id))
  return { success: true }
}

/** 目標と評価シートを紐づける */
export async function linkToEvaluationSheet(
  objectiveId: string,
  evaluationSheetId: string | null
): Promise<OkrActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!ADMIN_ROLES.includes(user.appRole ?? ''))
    return { success: false, error: '権限がありません' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('objectives')
    .update({ evaluation_sheet_id: evaluationSheetId })
    .eq('id', objectiveId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_OKR_DETAIL(objectiveId))
  return { success: true }
}
