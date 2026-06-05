'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { APP_ROUTES } from '@/config/routes'

const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  skillId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
})

/** 育成計画テンプレートを作成する */
export async function createTrainingPlanTemplate(input: {
  name: string
  skillId?: string
  description?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const parsed = templateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('training_plan_templates')
    .select('sort_order')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0

  const { error } = await supabase.from('training_plan_templates').insert({
    tenant_id: user.tenant_id,
    name: parsed.data.name,
    skill_id: parsed.data.skillId ?? null,
    description: parsed.data.description ?? null,
    sort_order: nextOrder,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

/** 育成計画テンプレートを論理削除する */
export async function deleteTrainingPlanTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('training_plan_templates')
    .update({ is_active: false })
    .eq('id', templateId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

/** テンプレートにコースを追加する */
export async function addCourseToTemplate(
  templateId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  // テンプレートがこのテナントのものであることを確認（テナント横断挿入を防ぐ）
  const { data: tmpl } = await supabase
    .from('training_plan_templates')
    .select('id')
    .eq('id', templateId)
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .maybeSingle()
  if (!tmpl) return { success: false, error: 'テンプレートが見つかりません' }

  const { data: existing } = await supabase
    .from('training_plan_template_courses')
    .select('sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0

  const { error } = await supabase.from('training_plan_template_courses').insert({
    template_id: templateId,
    tenant_id: user.tenant_id,
    course_id: courseId,
    sort_order: nextOrder,
  })

  // UNIQUE 制約違反（重複追加）はエラーとせずスキップ
  if (error && !error.message.includes('unique') && !error.message.includes('duplicate')) {
    return { success: false, error: error.message }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

/** テンプレートからコースを削除する */
export async function removeCourseFromTemplate(
  templateId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('training_plan_template_courses')
    .delete()
    .eq('template_id', templateId)
    .eq('course_id', courseId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

const createPlanSchema = z.object({
  employeeId: z.string().uuid(),
  templateId: z.string().uuid(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

/** 個人育成計画を作成し、テンプレートのコースを一括アサインする */
export async function createEmployeeTrainingPlan(input: {
  employeeId: string
  templateId: string
  dueDate?: string
}): Promise<{ success: boolean; error?: string; assignedCount?: number }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: 'Unauthorized' }
  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const parsed = createPlanSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()

  // 同一テンプレートの育成計画が既に存在する場合はエラー（重複計画を防ぐ）
  const { data: existingPlan } = await supabase
    .from('employee_training_plans')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .eq('employee_id', parsed.data.employeeId)
    .eq('template_id', parsed.data.templateId)
    .maybeSingle()
  if (existingPlan) return { success: false, error: '同じテンプレートの育成計画がすでに存在します' }

  // 育成計画レコードを作成
  const { error: planError } = await supabase.from('employee_training_plans').insert({
    tenant_id: user.tenant_id,
    employee_id: parsed.data.employeeId,
    template_id: parsed.data.templateId,
    due_date: parsed.data.dueDate ?? null,
    created_by: user.employee_id,
  })
  if (planError) return { success: false, error: planError.message }

  // テンプレートのコース一覧を取得
  const { data: tpCourses } = await supabase
    .from('training_plan_template_courses')
    .select('course_id')
    .eq('template_id', parsed.data.templateId)
    .eq('tenant_id', user.tenant_id)
    .order('sort_order')

  if (!tpCourses || tpCourses.length === 0) {
    revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
    return { success: true, assignedCount: 0 }
  }

  const courseIds = tpCourses.map(c => c.course_id)

  // 既存のアサインを確認（重複アサインを防ぐ）
  const { data: existingAssignments } = await supabase
    .from('el_assignments')
    .select('course_id')
    .eq('employee_id', parsed.data.employeeId)
    .eq('tenant_id', user.tenant_id)
    .in('course_id', courseIds)
  const alreadyAssigned = new Set((existingAssignments ?? []).map(a => a.course_id))

  // 未アサインのコースのみ挿入
  const newAssignments = courseIds
    .filter(cid => !alreadyAssigned.has(cid))
    .map(cid => ({
      tenant_id: user.tenant_id!,
      course_id: cid,
      employee_id: parsed.data.employeeId,
      assigned_by_employee_id: user.employee_id,
      due_date: parsed.data.dueDate ?? null,
    }))

  if (newAssignments.length > 0) {
    const { error: assignError } = await supabase.from('el_assignments').insert(newAssignments)
    if (assignError) return { success: false, error: assignError.message }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true, assignedCount: newAssignments.length }
}
