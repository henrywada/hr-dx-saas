'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { getGlobalEvaluationTemplates, getGlobalEvaluationTemplateWithItems } from './queries'
import type {
  GlobalEvaluationTemplateWithItems,
  GlobalEvalActionResult,
  EvaluationTemplateType,
  EvaluationAxis,
  MboCategory,
} from './types'

const TEMPLATES_PATH = APP_ROUTES.SAAS.EVAL_GLOBAL_TEMPLATES

async function getSaasAdminUser() {
  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) return null
  return user
}

/** グローバル評価テンプレート一覧ロード（SaaS管理者用） */
export async function loadGlobalEvaluationTemplatesAction(): Promise<
  GlobalEvaluationTemplateWithItems[] | null
> {
  const user = await getSaasAdminUser()
  if (!user) return null
  const supabase = await createClient()
  const templates = await getGlobalEvaluationTemplates(supabase)
  const results = await Promise.all(
    templates.map(t => getGlobalEvaluationTemplateWithItems(supabase, t.id))
  )
  return results.filter(Boolean) as GlobalEvaluationTemplateWithItems[]
}

// ---- テンプレート CRUD ----

export async function createGlobalEvaluationTemplate(input: {
  name: string
  template_type: EvaluationTemplateType
  description?: string
}): Promise<GlobalEvalActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('global_evaluation_templates').insert({
    name: input.name.trim(),
    template_type: input.template_type,
    description: input.description?.trim() || null,
    sort_order: 0,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function updateGlobalEvaluationTemplate(input: {
  id: string
  name?: string
  description?: string | null
  is_active?: boolean
  sort_order?: number
}): Promise<GlobalEvalActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = createAdminClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if ('description' in input) updates.description = input.description?.trim() || null
  if (input.is_active !== undefined) updates.is_active = input.is_active
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order
  const { error } = await (supabase as any)
    .from('global_evaluation_templates')
    .update(updates)
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

export async function deleteGlobalEvaluationTemplate(input: {
  id: string
}): Promise<GlobalEvalActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('global_evaluation_templates')
    .delete()
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(TEMPLATES_PATH)
  return { success: true }
}

// ---- テンプレート項目 CRUD ----

export async function createGlobalEvaluationTemplateItem(input: {
  template_id: string
  axis: EvaluationAxis
  mbo_category?: MboCategory | null
  name: string
  description?: string
  evaluation_focus?: string | null
  measurement_method?: string | null
  target_grade_note?: string | null
  weight?: number
  sort_order?: number
}): Promise<GlobalEvalActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('global_evaluation_template_items').insert({
    template_id: input.template_id,
    axis: input.axis,
    mbo_category: input.mbo_category ?? null,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    evaluation_focus: input.evaluation_focus?.trim() || null,
    measurement_method: input.measurement_method?.trim() || null,
    target_grade_note: input.target_grade_note?.trim() || null,
    weight: input.weight ?? 0,
    sort_order: input.sort_order ?? 0,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.SAAS.EVAL_GLOBAL_TEMPLATE_DETAIL(input.template_id))
  return { success: true }
}

export async function updateGlobalEvaluationTemplateItem(input: {
  id: string
  template_id: string
  name?: string
  description?: string | null
  evaluation_focus?: string | null
  measurement_method?: string | null
  target_grade_note?: string | null
  weight?: number
  sort_order?: number
}): Promise<GlobalEvalActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = createAdminClient()
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if ('description' in input) updates.description = input.description?.trim() || null
  if ('evaluation_focus' in input) updates.evaluation_focus = input.evaluation_focus?.trim() || null
  if ('measurement_method' in input)
    updates.measurement_method = input.measurement_method?.trim() || null
  if ('target_grade_note' in input)
    updates.target_grade_note = input.target_grade_note?.trim() || null
  if (input.weight !== undefined) updates.weight = input.weight
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order
  if (Object.keys(updates).length === 0) return { success: true }
  const { error } = await (supabase as any)
    .from('global_evaluation_template_items')
    .update(updates)
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.SAAS.EVAL_GLOBAL_TEMPLATE_DETAIL(input.template_id))
  return { success: true }
}

export async function deleteGlobalEvaluationTemplateItem(input: {
  id: string
  template_id: string
}): Promise<GlobalEvalActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { success: false, error: '権限がありません' }
  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('global_evaluation_template_items')
    .delete()
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.SAAS.EVAL_GLOBAL_TEMPLATE_DETAIL(input.template_id))
  return { success: true }
}
